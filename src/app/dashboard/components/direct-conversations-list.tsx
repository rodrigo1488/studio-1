'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { getInitials, cn } from '@/lib/utils';
import type { User } from '@/lib/data';
import { useSidebar } from '@/components/dashboard-sidebar';
import { getAllUnreadCounts } from '@/lib/storage/notifications';
import { Badge } from '@/components/ui/badge';
import { getCachedConversations, saveConversationsToCache } from '@/lib/storage/lists-cache';
import { ConversationSkeleton } from '@/components/ui/conversation-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MessageSquare } from 'lucide-react';

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
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const router = useRouter();
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
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    // Try to load from cache first
    const cachedConversations = getCachedConversations();
    if (cachedConversations && cachedConversations.length >= 0) {
      setConversations(cachedConversations);
      setIsLoading(false);
    }

    // Fetch from server (update cache in background)
    try {
      const response = await fetch('/api/direct-conversations/list');
      if (response.ok) {
        const data = await response.json();
        const conversations = data.conversations || [];
        setConversations(conversations);
        saveConversationsToCache(conversations);
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
          <ConversationSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />}
        title="Nenhuma conversa ainda"
        description="Adicione contatos e comece a conversar para ver suas conversas diretas aqui."
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {conversations.map((conversation) => {
        const unreadCount = unreadCounts[conversation.id] || 0;
        const hasUnread = unreadCount > 0;
        
        return (
          <div
            key={conversation.id}
            className={cn(
              "flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-4 cursor-pointer transition-colors duration-150",
              "hover:bg-muted/50 active:bg-muted",
              "border-b border-border/50 last:border-b-0"
            )}
            onClick={() => handleConversationClick(conversation.id)}
          >
            {/* Avatar */}
            <div className="shrink-0">
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14">
                <AvatarImage src={conversation.otherUser.avatarUrl} />
                <AvatarFallback className="text-sm sm:text-base font-semibold bg-primary/10 text-primary">
                  {getInitials(conversation.otherUser.name)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-1">
                {/* Name - não é mais um link */}
                <h3 className={cn(
                  "font-medium truncate text-sm sm:text-base",
                  hasUnread ? "text-foreground font-semibold" : "text-foreground"
                )} title={conversation.otherUser.name}>
                  {conversation.otherUser.name}
                </h3>
                
                {/* Time and Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  {conversation.lastMessage && (() => {
                    const timestamp = conversation.lastMessage.timestamp;
                    let timeText: string;
                    
                    if (isToday(timestamp)) {
                      // Se for hoje, mostra apenas a hora (ex: "14:30")
                      timeText = format(timestamp, 'HH:mm', { locale: ptBR });
                    } else if (isYesterday(timestamp)) {
                      // Se for ontem, mostra "Ontem"
                      timeText = 'Ontem';
                    } else {
                      // Se for mais antigo, mostra a data (ex: "15/01")
                      timeText = format(timestamp, 'dd/MM', { locale: ptBR });
                    }
                    
                    return (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {timeText}
                      </span>
                    );
                  })()}
                  {hasUnread && (
                    <Badge 
                      variant="destructive" 
                      className="h-5 min-w-5 px-1.5 text-xs font-semibold shrink-0"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Last Message */}
              <div className="flex items-center gap-2">
                {conversation.lastMessage ? (
                  <>
                    <p className={cn(
                      "text-sm truncate flex-1",
                      hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                    )} title={conversation.lastMessage.text}>
                      {conversation.lastMessage.text}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nenhuma mensagem ainda</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

