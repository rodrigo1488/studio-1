'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getInitials } from '@/lib/utils';
import type { ContactRequest } from '@/lib/data';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function ContactRequestsNotification() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    fetchPendingRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('contact_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_requests',
        },
        () => {
          // Refetch when any change occurs
          fetchPendingRequests();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/contact-requests/pending');
      if (response.ok) {
        const data = await response.json();
        const requestsWithDates = (data.requests || []).map((req: any) => ({
          ...req,
          createdAt: new Date(req.createdAt),
          updatedAt: new Date(req.updatedAt),
        }));
        setRequests(requestsWithDates);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      const response = await fetch('/api/contact-requests/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        // Remove from list
        setRequests((prev) => prev.filter((req) => req.id !== requestId));
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao aceitar solicitação');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Erro ao aceitar solicitação');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const response = await fetch('/api/contact-requests/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        // Remove from list
        setRequests((prev) => prev.filter((req) => req.id !== requestId));
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao recusar solicitação');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Erro ao recusar solicitação');
    }
  };

  const pendingCount = requests.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {pendingCount > 9 ? '9+' : pendingCount}
            </Badge>
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96" align="end">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Solicitações de Amizade</h4>
          {isLoading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : pendingCount === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Nenhuma solicitação pendente
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.requester?.avatarUrl} />
                    <AvatarFallback>
                      {getInitials(request.requester?.name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {request.requester?.name || 'Usuário'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(request.createdAt, {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        onClick={() => handleAccept(request.id)}
                      >
                        Aceitar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleReject(request.id)}
                      >
                        Recusar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

