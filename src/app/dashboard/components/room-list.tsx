'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { mockRooms, mockUsers } from '@/lib/data';
import { Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RoomList() {
  if (mockRooms.length === 0) {
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
      {mockRooms.map((room) => (
        <Link href={`/chat/${room.id}`} key={room.id} className="group">
          <Card className="h-full transition-all duration-300 ease-in-out group-hover:border-primary group-hover:shadow-lg group-hover:-translate-y-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold truncate">
                  {room.name}
                </CardTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{room.members.length}</span>
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
          </Card>
        </Link>
      ))}
    </div>
  );
}
