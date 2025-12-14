'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import type { Message, User } from '@/lib/data';
import Link from 'next/link';

interface MessageThreadProps {
  parentMessage: Message & { user?: User };
  currentUser: User;
  roomId: string;
  onReply?: (message: Message) => void;
}

export function MessageThread({
  parentMessage,
  currentUser,
  roomId,
  onReply,
}: MessageThreadProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [threadMessages, setThreadMessages] = useState<(Message & { user?: User })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadCount, setThreadCount] = useState(parentMessage.threadCount || 0);

  useEffect(() => {
    if (isExpanded && threadMessages.length === 0) {
      loadThreadMessages();
    }
  }, [isExpanded, parentMessage.id]);

  const loadThreadMessages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/messages/${parentMessage.id}/thread`);
      if (response.ok) {
        const data = await response.json();
        const messages = (data.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setThreadMessages(messages);
        setThreadCount(messages.length);
      }
    } catch (error) {
      console.error('Error loading thread messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (threadCount === 0 && !isExpanded) {
    return null;
  }

  return (
    <div className="mt-2 border-l-2 border-primary/30 pl-3 space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-7 text-xs text-muted-foreground hover:text-foreground"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-3 w-3 mr-1" />
            Ocultar {threadCount > 0 && `${threadCount} resposta${threadCount !== 1 ? 's' : ''}`}
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3 mr-1" />
            Ver {threadCount} resposta{threadCount !== 1 ? 's' : ''}
          </>
        )}
      </Button>

      {isExpanded && (
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <>
              {threadMessages.map((message) => (
                <div
                  key={message.id}
                  className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                >
                  <Link href={`/profile/${message.senderId}`} className="hover:opacity-80 transition-opacity shrink-0">
                    <Avatar className="h-6 w-6 cursor-pointer">
                      <AvatarImage src={message.user?.avatarUrl} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(message.user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/profile/${message.senderId}`}
                        className="text-xs font-semibold hover:underline"
                      >
                        {message.user?.name || 'Usuário'}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {format(message.timestamp, 'p', { locale: ptBR })}
                      </span>
                    </div>
                    {message.text && (
                      <p className="text-sm">{message.text}</p>
                    )}
                    {message.mediaUrl && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {message.mediaType === 'image' ? '📷 Imagem' :
                         message.mediaType === 'video' ? '🎥 Vídeo' :
                         message.mediaType === 'audio' ? '🎵 Áudio' : '🎬 GIF'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {threadMessages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhuma resposta ainda
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}



