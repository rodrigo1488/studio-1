'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { getInitials } from '@/lib/utils';
import type { User } from '@/lib/data';
import { useSidebar } from '@/components/dashboard-sidebar';

interface DirectConversation {
  id: string;
  user1Id: string;
  user2Id: string;
  otherUser: User;
  lastMessage?: {
    text: string;
    timestamp: Date;
  };
}

export default function DirectConversationsList() {
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const sidebar = useSidebar();
  const closeMobileSidebar = sidebar?.closeMobileSidebar;

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/direct-conversations/list');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConversationClick = (conversationId: string) => {
    closeMobileSidebar?.();
    router.push(`/chat/${conversationId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-20 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma conversa direta ainda. Adicione contatos para começar a conversar!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 h-full overflow-y-auto">
      {conversations.map((conversation) => (
        <Card
          key={conversation.id}
          className="p-3 sm:p-4 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => handleConversationClick(conversation.id)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
              <AvatarImage src={conversation.otherUser.avatarUrl} />
              <AvatarFallback>
                {getInitials(conversation.otherUser.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="font-medium truncate text-sm sm:text-base" title={conversation.otherUser.name}>
                {conversation.otherUser.name}
              </p>
              {conversation.lastMessage ? (
                <>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate mt-1" title={conversation.lastMessage.text}>
                    {conversation.lastMessage.text}
                  </p>
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    {formatDistanceToNow(conversation.lastMessage.timestamp, {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Nenhuma mensagem ainda</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

