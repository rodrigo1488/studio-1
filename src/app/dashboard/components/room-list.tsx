'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, QrCode } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import type { Room } from '@/lib/data';
import { RoomCodeDisplay } from '@/components/room-code-display';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/dashboard-sidebar';
import { cn } from '@/lib/utils';
import { getAllUnreadCounts, getUnreadCount } from '@/lib/storage/notifications';
import { Badge } from '@/components/ui/badge';

export default function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const sidebar = useSidebar();
  const closeMobileSidebar = sidebar?.closeMobileSidebar;

  // Load unread counts
  useEffect(() => {
    const loadUnreadCounts = () => {
      setUnreadCounts(getAllUnreadCounts());
    };
    
    loadUnreadCounts();
    
    // Listen for unread count updates
    const handleUpdate = () => loadUnreadCounts();
    window.addEventListener('unreadCountUpdated', handleUpdate);
    
    return () => {
      window.removeEventListener('unreadCountUpdated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const response = await fetch('/api/rooms/list');
        if (response.ok) {
          const data = await response.json();
          setRooms(data.rooms || []);
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRooms();
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-1">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-32 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 sm:p-12 text-center">
        <h3 className="text-lg sm:text-xl font-semibold">Nenhuma sala encontrada</h3>
        <p className="mt-2 text-sm text-muted-foreground px-4">
          Crie uma nova sala para começar a conversar com sua família.
        </p>
      </div>
    );
  }

  const rainbowBorders = [
    'border-[#3B82F6]',
    'border-[#EC4899]',
    'border-[#10B981]',
    'border-[#F59E0B]',
    'border-[#8B5CF6]',
    'border-[#EF4444]',
  ];
  const rainbowBackgrounds = [
    'bg-gradient-to-br from-[#3B82F6]/10 to-[#3B82F6]/5',
    'bg-gradient-to-br from-[#EC4899]/10 to-[#EC4899]/5',
    'bg-gradient-to-br from-[#10B981]/10 to-[#10B981]/5',
    'bg-gradient-to-br from-[#F59E0B]/10 to-[#F59E0B]/5',
    'bg-gradient-to-br from-[#8B5CF6]/10 to-[#8B5CF6]/5',
    'bg-gradient-to-br from-[#EF4444]/10 to-[#EF4444]/5',
  ];

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1">
      {rooms.map((room, index) => {
        const borderColor = rainbowBorders[index % rainbowBorders.length];
        const bgGradient = rainbowBackgrounds[index % rainbowBackgrounds.length];
        
        return (
        <Card
          key={room.id}
          className={cn(
            "h-full transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1 flex flex-col animate-slide-in-color",
            borderColor,
            bgGradient
          )}
        >
          <Link 
            href={`/chat/${room.id}`} 
            className="group flex-1 min-w-0"
            onClick={() => closeMobileSidebar?.()}
          >
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <CardTitle className="text-base sm:text-lg font-semibold truncate flex-1 min-w-0" title={room.name}>
                    {room.name}
                  </CardTitle>
                  {unreadCounts[room.id] > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs shrink-0">
                      {unreadCounts[room.id] > 99 ? '99+' : unreadCounts[room.id]}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground shrink-0">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{room.memberCount || room.members.length}</span>
                </div>
              </div>
              {room.lastMessage && (
                <div className="pt-2 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate" title={room.lastMessage.text}>
                    {room.lastMessage.text}
                  </p>
                  <p className="text-xs text-muted-foreground/80 pt-1">
                    {formatDistanceToNow(room.lastMessage.timestamp, {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              )}
            </CardHeader>
          </Link>
          {room.code && (
            <div className="px-4 sm:px-6 pb-4 pt-0">
              <RoomCodeDisplay
                code={room.code}
                roomName={room.name}
                showInModal={true}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs sm:text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <QrCode className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Ver Código
                  </Button>
                }
              />
            </div>
          )}
        </Card>
        );
      })}
    </div>
  );
}
