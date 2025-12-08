'use client';

import {
  ArrowLeft,
  Paperclip,
  Send,
  Phone,
  Image as ImageIcon,
  Mic,
  Video,
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
  messages,
  currentUser,
}: ChatLayoutProps) {
  const [messageText, setMessageText] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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


  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      console.log('Sending message:', messageText);
      // In a real app, this would send the message to Firestore
      setMessageText('');
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Phone className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Iniciar chamada de áudio</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
                {message.mediaUrl && message.mediaType === 'image' && (
                    <Image
                        src={message.mediaUrl}
                        alt="Media content"
                        width={300}
                        height={200}
                        className="rounded-lg mb-2 object-cover"
                    />
                )}
                <p>{message.text}</p>
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
                 <Button variant="ghost" size="icon"><ImageIcon/></Button>
                 <Button variant="ghost" size="icon"><Video/></Button>
                 <Button variant="ghost" size="icon"><Mic/></Button>
              </div>
            </PopoverContent>
          </Popover>

          <Input
            autoComplete="off"
            placeholder="Digite uma mensagem..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
          <Button type="submit" size="icon" disabled={!messageText.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
