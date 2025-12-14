'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

  const rainbowBorders = [
    'border-[#3B82F6]',
    'border-[#EC4899]',
    'border-[#10B981]',
    'border-[#F59E0B]',
    'border-[#8B5CF6]',
    'border-[#EF4444]',
  ];
  const rainbowBackgrounds = [
    'bg-gradient-to-r from-[#3B82F6]/10 to-[#3B82F6]/5',
    'bg-gradient-to-r from-[#EC4899]/10 to-[#EC4899]/5',
    'bg-gradient-to-r from-[#10B981]/10 to-[#10B981]/5',
    'bg-gradient-to-r from-[#F59E0B]/10 to-[#F59E0B]/5',
    'bg-gradient-to-r from-[#8B5CF6]/10 to-[#8B5CF6]/5',
    'bg-gradient-to-r from-[#EF4444]/10 to-[#EF4444]/5',
  ];

  return (
    <div className="space-y-2 h-full overflow-y-auto">
      {conversations.map((conversation, index) => {
        const borderColor = rainbowBorders[index % rainbowBorders.length];
        const bgGradient = rainbowBackgrounds[index % rainbowBackgrounds.length];
        
        return (
        <Card
          key={conversation.id}
          className={cn(
            "p-2 sm:p-3 md:p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-slide-in-color rounded-lg sm:rounded-xl",
            borderColor,
            bgGradient
          )}
          onClick={() => handleConversationClick(conversation.id)}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link 
              href={`/profile/${conversation.otherUser.id}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:opacity-80 transition-opacity shrink-0"
            >
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 cursor-pointer">
                <AvatarImage src={conversation.otherUser.avatarUrl} />
                <AvatarFallback className="text-xs sm:text-sm">
                  {getInitials(conversation.otherUser.name)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href={`/profile/${conversation.otherUser.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium truncate text-xs sm:text-sm md:text-base flex-1 hover:underline"
                  title={conversation.otherUser.name}
                >
                  {conversation.otherUser.name}
                </Link>
                {unreadCounts[conversation.id] > 0 && (
                  <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px] sm:h-5 sm:min-w-5 sm:px-1.5 sm:text-xs shrink-0">
                    {unreadCounts[conversation.id] > 99 ? '99+' : unreadCounts[conversation.id]}
                  </Badge>
                )}
              </div>
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
        );
      })}
    </div>
  );
}

