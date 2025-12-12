'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageReaction } from '@/lib/supabase/message-reactions';
import { useToast } from '@/hooks/use-toast';

interface MessageReactionsProps {
  messageId: string;
  currentUserId: string;
  onReactionChange?: () => void;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

export function MessageReactions({ messageId, currentUserId, onReactionChange }: MessageReactionsProps) {
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReactions();
  }, [messageId]);

  const fetchReactions = async () => {
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions`);
      if (response.ok) {
        const data = await response.json();
        setReactions(data.reactions || []);
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactionClick = async (emoji: string) => {
    try {
      const existingReaction = reactions.find(
        (r) => r.emoji === emoji && r.userId === currentUserId
      );

      if (existingReaction) {
        // Remove reaction
        const response = await fetch(`/api/messages/${messageId}/reactions`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji }),
        });

        if (response.ok) {
          setReactions((prev) => prev.filter((r) => r.id !== existingReaction.id));
          onReactionChange?.();
        }
      } else {
        // Add reaction
        const response = await fetch(`/api/messages/${messageId}/reactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji }),
        });

        if (response.ok) {
          const data = await response.json();
          setReactions((prev) => [...prev, data.reaction]);
          onReactionChange?.();
        }
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a reação',
        variant: 'destructive',
      });
    }
  };

  // Group reactions by emoji
  const reactionsByEmoji = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

  if (isLoading && reactions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {Object.entries(reactionsByEmoji).map(([emoji, emojiReactions]) => {
        const hasUserReaction = emojiReactions.some((r) => r.userId === currentUserId);
        return (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 px-1.5 text-xs rounded-full border',
              hasUserReaction
                ? 'bg-primary/10 border-primary/30'
                : 'bg-muted border-border hover:bg-muted/80'
            )}
            onClick={() => handleReactionClick(emoji)}
          >
            <span className="mr-1">{emoji}</span>
            <span className="text-[10px]">{emojiReactions.length}</span>
          </Button>
        );
      })}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full border border-border hover:bg-muted"
          >
            <Smile className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg hover:bg-muted"
                onClick={() => handleReactionClick(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

