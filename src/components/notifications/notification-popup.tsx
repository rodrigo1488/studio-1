'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { getInitials, cn } from '@/lib/utils';
import type { Message, User } from '@/lib/data';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationPopupProps {
  roomId: string;
  roomName: string;
  sender: User;
  message: Message;
  onClose: () => void;
  onClick?: () => void;
}

export function NotificationPopup({
  roomId,
  roomName,
  sender,
  message,
  onClose,
  onClick,
}: NotificationPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animar entrada
    setTimeout(() => setIsVisible(true), 10);

    // Auto-fechar após 5 segundos
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onClose();
      }, 300); // Tempo da animação de saída
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClick = () => {
    if (onClick) {
      onClick();
      onClose();
    }
  };

  const messagePreview = message.text || 
    (message.mediaType === 'image' ? '📷 Imagem' : 
     message.mediaType === 'video' ? '🎥 Vídeo' : 
     message.mediaType === 'audio' ? '🎵 Áudio' : 'Mensagem');

  return (
    <Card
      className={cn(
        'fixed top-4 left-4 z-50 w-80 sm:w-96 shadow-lg cursor-pointer transition-all duration-300 ease-in-out',
        isVisible && !isExiting
          ? 'translate-x-0 opacity-100'
          : '-translate-x-full opacity-0'
      )}
      onClick={handleClick}
    >
      <div className="p-4 flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={sender.avatarUrl} />
          <AvatarFallback>{getInitials(sender.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-semibold text-sm truncate">{sender.name}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExiting(true);
                setTimeout(() => onClose(), 300);
              }}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-1 truncate">{roomName}</p>
          <p className="text-sm text-foreground line-clamp-2">{messagePreview}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(message.timestamp, { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      </div>
    </Card>
  );
}

