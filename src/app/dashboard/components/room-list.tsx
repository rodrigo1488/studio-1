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

export default function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-32 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
        <h3 className="text-xl font-semibold">Nenhuma sala encontrada</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie uma nova sala para começar a conversar com sua família.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <Card
          key={room.id}
          className="h-full transition-all duration-300 ease-in-out hover:border-primary hover:shadow-lg hover:-translate-y-1 flex flex-col"
        >
          <Link href={`/chat/${room.id}`} className="group flex-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold truncate">
                  {room.name}
                </CardTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{room.memberCount || room.members.length}</span>
                </div>
              </div>
              {room.lastMessage && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground truncate">
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
            <div className="px-6 pb-4 pt-0">
              <RoomCodeDisplay
                code={room.code}
                roomName={room.name}
                showInModal={true}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Ver Código
                  </Button>
                }
              />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
