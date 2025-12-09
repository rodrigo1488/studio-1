'use client';

import {
  ArrowLeft,
  Paperclip,
  Send,
  Phone,
  Image as ImageIcon,
  Mic,
  Video,
  QrCode,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Room, Message, User } from '@/lib/data';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { subscribeToMessages, unsubscribeFromChannel, convertMessageToAppFormat } from '@/lib/supabase/realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { getMediaTypeFromFile } from '@/lib/supabase/storage';
import { RoomCodeDisplay } from '@/components/room-code-display';
import { CallButton } from '@/components/webrtc/call-button';

interface ChatLayoutProps {
  room: Room;
  messages: (Message & { user?: User })[];
  currentUser: User;
}

const getInitials = (name: string = '') => {
  const names = name.split(' ');
  const initials = names.map((n) => n[0]).join('');
  return initials.slice(0, 2).toUpperCase();
};

const formatDate = (date: Date) => {
  if (isToday(date)) {
    return `Hoje ${format(date, 'p', { locale: ptBR })}`;
  }
  if (isYesterday(date)) {
    return `Ontem ${format(date, 'p', { locale: ptBR })}`;
  }
  return format(date, 'P p', { locale: ptBR });
};

export default function ChatLayout({
  room,
  messages: initialMessages,
  currentUser,
}: ChatLayoutProps) {
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<(Message & { user?: User })[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { toast } = useToast();

  // Subscribe to realtime messages
  useEffect(() => {
    const channel = subscribeToMessages(room.id, async (newMessage) => {
      // Fetch user data for the new message
      try {
        const userResponse = await fetch(`/api/users/${newMessage.sender_id}`);
        let user = undefined;
        if (userResponse.ok) {
          const userData = await userResponse.json();
          user = userData.user;
        }
        const appMessage = convertMessageToAppFormat(newMessage, user);
        
        setMessages((prev) => {
          // Check if message already exists
          if (prev.find((m) => m.id === appMessage.id)) {
            return prev;
          }
          return [...prev, appMessage];
        });
      } catch (error) {
        console.error('Error fetching user for new message:', error);
        // Still add message without user data
        const appMessage = convertMessageToAppFormat(newMessage);
        setMessages((prev) => {
          if (prev.find((m) => m.id === appMessage.id)) {
            return prev;
          }
          return [...prev, appMessage];
        });
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
      }
    };
  }, [room.id]);

  // Update messages when initialMessages change
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        // A slight delay ensures the DOM has updated before scrolling
        setTimeout(() => {
            const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }, 100);
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!messageText.trim() || isSending) return;

    setIsSending(true);
    const text = messageText.trim();
    setMessageText('');

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: room.id,
          text,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast({
          title: 'Erro ao enviar mensagem',
          description: data.error || 'Tente novamente',
          variant: 'destructive',
        });
        setMessageText(text); // Restore message text
      }
    } catch (error) {
      toast({
        title: 'Erro ao enviar mensagem',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
      setMessageText(text); // Restore message text
    } finally {
      setIsSending(false);
    }
  };

  const handleMediaUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    mediaType: 'image' | 'video' | 'audio'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB = 10485760 bytes)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Arquivo muito grande',
        description: `O arquivo deve ter no máximo ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    // Validate file type
    const detectedType = getMediaTypeFromFile(file);
    if (!detectedType || detectedType !== mediaType) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: `Por favor, selecione um arquivo ${mediaType === 'image' ? 'de imagem' : mediaType === 'video' ? 'de vídeo' : 'de áudio'}`,
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    setIsSending(true);

    try {
      // Generate a temporary message ID for the upload path
      const tempMessageId = crypto.randomUUID();

      // Upload media via API route
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', room.id);
      formData.append('messageId', tempMessageId);

      const uploadResponse = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao fazer upload da mídia');
      }

      const uploadData = await uploadResponse.json().catch(() => null);
      if (!uploadData || !uploadData.url) {
        throw new Error('Resposta inválida do servidor');
      }

      const { url } = uploadData;

      // Send message with media
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: room.id,
          text: mediaType === 'image' ? '📷 Imagem' : mediaType === 'video' ? '🎥 Vídeo' : '🎵 Áudio',
          mediaUrl: url,
          mediaType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast({
          title: 'Erro ao enviar mídia',
          description: data.error || 'Tente novamente',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar mídia',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
      // Reset file input
      e.target.value = '';
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Chat Header */}
      <header className="flex h-16 items-center justify-between border-b bg-background/80 px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="-ml-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{getInitials(room.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold">{room.name}</span>
              <span className="text-xs text-muted-foreground">
                {room.members.length} membros
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {room.code && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <RoomCodeDisplay
                      code={room.code}
                      roomName={room.name}
                      showInModal={true}
                      trigger={
                        <Button variant="ghost" size="icon">
                          <QrCode className="h-5 w-5" />
                        </Button>
                      }
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver código da sala</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <CallButton room={room} currentUser={currentUser} />
        </div>
      </header>

      {/* Message Area */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex items-end gap-2',
                message.senderId === currentUser.id ? 'justify-end' : 'justify-start'
              )}
            >
              {message.senderId !== currentUser.id && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.user?.avatarUrl} />
                  <AvatarFallback>{getInitials(message.user?.name)}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-xs md:max-w-md lg:max-w-lg rounded-xl p-3 text-sm flex flex-col',
                  message.senderId === currentUser.id
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-card text-card-foreground rounded-bl-none'
                )}
              >
                {message.mediaUrl && (
                  <div className="mb-2 rounded-lg overflow-hidden">
                    {message.mediaType === 'image' && (
                      <Image
                        src={message.mediaUrl}
                        alt="Imagem enviada"
                        width={300}
                        height={200}
                        className="rounded-lg object-cover w-full"
                        unoptimized
                      />
                    )}
                    {message.mediaType === 'video' && (
                      <video
                        src={message.mediaUrl}
                        controls
                        className="rounded-lg w-full max-h-64"
                        preload="metadata"
                      >
                        Seu navegador não suporta o elemento de vídeo.
                      </video>
                    )}
                    {message.mediaType === 'audio' && (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <audio
                          src={message.mediaUrl}
                          controls
                          className="w-full"
                          preload="metadata"
                        >
                          Seu navegador não suporta o elemento de áudio.
                        </audio>
                      </div>
                    )}
                  </div>
                )}
                {message.text && <p>{message.text}</p>}
                <span className={cn(
                    "text-xs mt-1 self-end",
                     message.senderId === currentUser.id
                    ? 'text-primary-foreground/70'
                    : 'text-muted-foreground'
                )}>
                  {format(message.timestamp, 'p', { locale: ptBR })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <footer className="border-t p-2 md:p-4 shrink-0">
        <form
          className="flex w-full items-center gap-2"
          onSubmit={handleSendMessage}
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Paperclip className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1">
              <div className="flex gap-1">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleMediaUpload(e, 'image')}
                />
                <input
                  type="file"
                  id="video-upload"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleMediaUpload(e, 'video')}
                />
                <input
                  type="file"
                  id="audio-upload"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => handleMediaUpload(e, 'audio')}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={isSending}
                >
                  <ImageIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => document.getElementById('video-upload')?.click()}
                  disabled={isSending}
                >
                  <Video />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => document.getElementById('audio-upload')?.click()}
                  disabled={isSending}
                >
                  <Mic />
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Input
            autoComplete="off"
            placeholder="Digite uma mensagem..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={isSending}
          />
          <Button type="submit" size="icon" disabled={!messageText.trim() || isSending}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
