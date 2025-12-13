'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, QrCode, Info } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import type { Room, User } from '@/lib/data';
import { RoomCodeDisplay } from '@/components/room-code-display';
import { RoomDetails } from '@/components/room-details';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/dashboard-sidebar';
import { cn } from '@/lib/utils';
import { getAllUnreadCounts, getUnreadCount } from '@/lib/storage/notifications';
import { Badge } from '@/components/ui/badge';
import { getCachedRooms, saveRoomsToCache } from '@/lib/storage/lists-cache';
import { getCachedCurrentUser } from '@/lib/storage/room-cache';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export default function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const sidebar = useSidebar();
  const closeMobileSidebar = sidebar?.closeMobileSidebar;

  useEffect(() => {
    const user = getCachedCurrentUser();
    if (user) {
      setCurrentUser(user);
    } else {
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setCurrentUser(data.user);
          }
        });
    }
  }, []);

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
      // Try to load from cache first
      const cachedRooms = getCachedRooms();
      if (cachedRooms && cachedRooms.length > 0) {
        setRooms(cachedRooms);
        setIsLoading(false);
      }

      // Fetch from server (update cache in background)
      try {
        const response = await fetch('/api/rooms/list');
        if (response.ok) {
          const data = await response.json();
          const rooms = data.rooms || [];
          setRooms(rooms);
          saveRoomsToCache(rooms);
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
          <Card key={i} className="p-3 sm:p-4 md:p-6">
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />}
        title="Nenhuma sala encontrada"
        description="Crie uma nova sala para começar a conversar com sua família e amigos."
      />
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
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between gap-1.5 sm:gap-2 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                  <CardTitle className="text-sm sm:text-base md:text-lg font-semibold truncate flex-1 min-w-0" title={room.name}>
                    {room.name}
                  </CardTitle>
                  {unreadCounts[room.id] > 0 && (
                    <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px] sm:h-5 sm:min-w-5 sm:px-1.5 sm:text-xs shrink-0">
                      {unreadCounts[room.id] > 99 ? '99+' : unreadCounts[room.id]}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-xs md:text-sm text-muted-foreground shrink-0">
                  <Users className="h-3 w-3 sm:h-3 sm:w-3 md:h-4 md:w-4" />
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
          <div className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 pt-0 space-y-1.5 sm:space-y-2">
            {room.code && !room.code.startsWith('DM-') && (
              <RoomCodeDisplay
                code={room.code}
                roomName={room.name}
                showInModal={true}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs sm:text-sm py-1.5 sm:py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <QrCode className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Ver Código
                  </Button>
                }
              />
            )}
            {!room.code?.startsWith('DM-') && currentUser && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs sm:text-sm py-1.5 sm:py-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRoom(room);
                  setShowDetails(true);
                }}
              >
                <Info className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Detalhes
              </Button>
            )}
          </div>
        </Card>
        );
      })}
      {selectedRoom && currentUser && (
        <RoomDetails
          room={selectedRoom}
          currentUser={currentUser}
          open={showDetails}
          onOpenChange={setShowDetails}
        />
      )}
    </div>
  );
}
