'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Search, MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { User, ContactRequest } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { getCachedContacts, saveContactsToCache } from '@/lib/storage/lists-cache';

export default function ContactsList() {
  const [contacts, setContacts] = useState<User[]>([]);
  const [sentRequests, setSentRequests] = useState<ContactRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchContacts();
    fetchSentRequests();
  }, []);

  const fetchContacts = async () => {
    // Try to load from cache first
    const cachedContacts = getCachedContacts();
    if (cachedContacts && cachedContacts.length >= 0) {
      setContacts(cachedContacts);
      setIsLoading(false);
    }

    // Fetch from server (update cache in background)
    try {
      const response = await fetch('/api/contacts/list');
      if (response.ok) {
        const data = await response.json();
        const contacts = data.contacts || [];
        setContacts(contacts);
        saveContactsToCache(contacts);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSentRequests = async () => {
    try {
      const response = await fetch('/api/contact-requests/sent');
      if (response.ok) {
        const data = await response.json();
        const requestsWithDates = (data.requests || []).map((req: any) => ({
          ...req,
          createdAt: new Date(req.createdAt),
          updatedAt: new Date(req.updatedAt),
        }));
        setSentRequests(requestsWithDates);
      }
    } catch (error) {
      console.error('Error fetching sent requests:', error);
    }
  };

  const getRequestStatus = (userId: string): 'contact' | 'pending' | 'none' => {
    if (contacts.some((c) => c.id === userId)) {
      return 'contact';
    }
    if (sentRequests.some((r) => r.requestedId === userId && r.status === 'pending')) {
      return 'pending';
    }
    return 'none';
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/contact-requests/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        setSentRequests((prev) => prev.filter((r) => r.id !== requestId));
        toast({
          title: 'Solicitação cancelada',
          description: 'A solicitação foi cancelada com sucesso.',
        });
      } else {
        const data = await response.json();
        toast({
          title: 'Erro',
          description: data.error || 'Não foi possível cancelar a solicitação',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    }
  };

  const handleSearch = async () => {
    if (!nickname.trim()) {
      toast({
        title: 'Nickname necessário',
        description: 'Digite um nickname para buscar',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/nickname/${encodeURIComponent(nickname.trim())}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResult(data.user);
      } else {
        const data = await response.json();
        toast({
          title: 'Usuário não encontrado',
          description: data.error || 'Nenhum usuário encontrado com este nickname',
          variant: 'destructive',
        });
        setSearchResult(null);
      }
    } catch (error) {
      toast({
        title: 'Erro ao buscar',
        description: 'Ocorreu um erro ao buscar o usuário',
        variant: 'destructive',
      });
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddContact = async (contactId: string) => {
    try {
      const response = await fetch('/api/contacts/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Solicitação enviada!',
          description: 'A solicitação de amizade foi enviada. Aguarde a resposta.',
        });
        setSearchResult(null);
        setNickname('');
        setIsDialogOpen(false);
        // Refetch sent requests
        fetchSentRequests();
      } else {
        const data = await response.json();
        toast({
          title: 'Erro ao adicionar',
          description: data.error || 'Não foi possível adicionar o contato',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao adicionar',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
            <UserPlus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Adicionar Contato</span>
            <span className="sm:hidden">Adicionar</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Adicionar Contato</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Digite o nickname do usuário que deseja adicionar aos seus contatos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Digite o nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="text-sm sm:text-base"
              />
              <Button onClick={handleSearch} disabled={isSearching || !nickname.trim()} size="icon" className="shrink-0">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {searchResult && (
              <div className="flex items-center justify-between p-2 sm:p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 to-secondary/10 gap-2 sm:gap-3 shadow-md">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                    <AvatarImage src={searchResult.avatarUrl} />
                    <AvatarFallback className="text-xs sm:text-sm">{getInitials(searchResult.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="font-medium truncate text-sm sm:text-base" title={searchResult.name}>
                      {searchResult.name}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate" title={`@${searchResult.nickname}`}>
                      @{searchResult.nickname}
                    </p>
                  </div>
                </div>
                {(() => {
                  const status = getRequestStatus(searchResult.id);
                  if (status === 'contact') {
                    return (
                      <Button
                        size="sm"
                        disabled
                        variant="outline"
                        className="shrink-0 text-xs px-2 sm:px-3"
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        <span className="hidden sm:inline">Contato</span>
                      </Button>
                    );
                  }
                  if (status === 'pending') {
                    const request = sentRequests.find((r) => r.requestedId === searchResult.id);
                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => request && handleCancelRequest(request.id)}
                        className="shrink-0 text-xs px-2 sm:px-3"
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        <span className="hidden sm:inline">Pendente</span>
                      </Button>
                    );
                  }
                  return (
                    <Button
                      size="sm"
                      onClick={() => handleAddContact(searchResult.id)}
                      className="shrink-0 text-xs px-2 sm:px-3"
                    >
                      <UserPlus className="mr-1 h-3 w-3" />
                      <span className="hidden sm:inline">Adicionar</span>
                    </Button>
                  );
                })()}
              </div>
            )}

            {contacts.length === 0 && !searchResult && (
              <p className="text-sm text-center text-muted-foreground py-4">
                Nenhum contato adicionado ainda
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2 h-full overflow-y-auto">
        {contacts.map((contact, index) => {
          const rainbowColors = [
            'border-[#3B82F6]',
            'border-[#EC4899]',
            'border-[#10B981]',
            'border-[#F59E0B]',
            'border-[#8B5CF6]',
            'border-[#EF4444]',
          ];
          const borderColor = rainbowColors[index % rainbowColors.length];
          
          return (
          <div
            key={contact.id}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 md:gap-3 p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl border-2 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5",
              borderColor,
              "bg-gradient-to-r from-white to-primary/5"
            )}
          >
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 shrink-0">
              <AvatarImage src={contact.avatarUrl} />
              <AvatarFallback className="text-xs sm:text-sm">{getInitials(contact.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="font-medium truncate text-xs sm:text-sm md:text-base" title={contact.name}>
                {contact.name}
              </p>
              {contact.nickname && (
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate" title={`@${contact.nickname}`}>
                  @{contact.nickname}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 p-0"
              onClick={async () => {
                try {
                  const response = await fetch('/api/direct-conversations/create', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ otherUserId: contact.id }),
                  });

                  if (response.ok) {
                    const data = await response.json();
                    router.push(`/chat/${data.conversationId}`);
                  } else {
                    const data = await response.json();
                    toast({
                      title: 'Erro ao iniciar conversa',
                      description: data.error || 'Não foi possível iniciar a conversa',
                      variant: 'destructive',
                    });
                  }
                } catch (error) {
                  toast({
                    title: 'Erro ao iniciar conversa',
                    description: 'Ocorreu um erro inesperado',
                    variant: 'destructive',
                  });
                }
              }}
            >
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
          );
        })}
      </div>
    </div>
  );
}

