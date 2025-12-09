'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Phone, Video, Mic } from 'lucide-react';
import { useCall } from '@/contexts/call-context';
import { CallUI } from './call-ui';
import type { User, Room } from '@/lib/data';

interface CallButtonProps {
  room: Room;
  currentUser: User;
}

export function CallButton({ room, currentUser }: CallButtonProps) {
  // Try to use the call context, but handle gracefully if not available
  let startCall, status, currentCall;
  try {
    const callContext = useCall();
    startCall = callContext.startCall;
    status = callContext.status;
    currentCall = callContext.currentCall;
  } catch (error) {
    // CallProvider not available, don't render the button
    return null;
  }
  const [otherUser, setOtherUser] = useState<User | null>(null);

  // Busca o outro usuário da sala (para conversas diretas com 2 membros)
  useEffect(() => {
    async function fetchOtherUser() {
      // Só funciona para salas com exatamente 2 membros
      if (room.members.length !== 2) {
        return;
      }

      const otherUserId = room.members.find((id) => id !== currentUser.id);
      if (!otherUserId) return;

      try {
        const response = await fetch(`/api/users/${otherUserId}`);
        if (response.ok) {
          const data = await response.json();
          setOtherUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching other user:', error);
      }
    }

    fetchOtherUser();
  }, [room.members, currentUser.id]);

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!otherUser) return;

    try {
      await startCall(room.id, currentUser.id, otherUser.id, otherUser.name, type);
    } catch (error: any) {
      console.error('Error starting call:', error);
      const errorMessage = error?.message || 'Erro ao iniciar chamada';
      
      if (errorMessage.includes('servidor de sinalização') || errorMessage.includes('WebSocket')) {
        alert('Servidor WebSocket não está rodando!\n\nPor favor, inicie o servidor em um terminal separado com:\n\nnpm run ws:server\n\nOu para desenvolvimento:\n\nnpm run ws:dev');
      } else {
        alert(`Erro ao iniciar chamada: ${errorMessage}`);
      }
    }
  };

  // Só mostra o botão para conversas diretas (2 membros)
  if (room.members.length !== 2 || !otherUser) {
    return null;
  }

  // Mostra CallUI se há uma chamada ativa para esta sala
  const showCallUI = currentCall?.roomId === room.id && (status === 'calling' || status === 'connected');

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" disabled={status !== 'idle'}>
            <Phone className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => handleStartCall('audio')}
              disabled={status !== 'idle'}
            >
              <Mic className="h-4 w-4 mr-2" />
              Chamada de áudio
            </Button>
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => handleStartCall('video')}
              disabled={status !== 'idle'}
            >
              <Video className="h-4 w-4 mr-2" />
              Chamada de vídeo
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {showCallUI && otherUser && (
        <CallUI
          roomId={room.id}
          currentUserId={currentUser.id}
          otherUserId={otherUser.id}
          otherUserName={otherUser.name}
        />
      )}
    </>
  );
}

