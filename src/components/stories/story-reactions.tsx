'use client';

import { useState } from 'react';
import { Heart, Smile, Laugh, Frown, Angry, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { StoryReactionType } from '@/lib/supabase/story-reactions';

interface StoryReactionsProps {
  storyId: string;
  currentUserId: string;
  initialReaction?: StoryReactionType;
  onReactionChange?: (reaction: StoryReactionType | null) => void;
}

const REACTIONS: Array<{ type: StoryReactionType; icon: React.ReactNode; label: string; color: string }> = [
  { type: 'like', icon: <Heart className="h-5 w-5" />, label: 'Curtir', color: 'text-red-500' },
  { type: 'love', icon: <Heart className="h-5 w-5 fill-red-500 text-red-500" />, label: 'Amar', color: 'text-red-500' },
  { type: 'laugh', icon: <Laugh className="h-5 w-5" />, label: 'Rir', color: 'text-yellow-500' },
  { type: 'wow', icon: <Sparkles className="h-5 w-5" />, label: 'Uau', color: 'text-blue-500' },
  { type: 'sad', icon: <Frown className="h-5 w-5" />, label: 'Triste', color: 'text-blue-400' },
  { type: 'angry', icon: <Angry className="h-5 w-5" />, label: 'Bravo', color: 'text-orange-500' },
];

export function StoryReactions({ storyId, currentUserId, initialReaction, onReactionChange }: StoryReactionsProps) {
  const [currentReaction, setCurrentReaction] = useState<StoryReactionType | null>(initialReaction || null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReaction = async (reactionType: StoryReactionType) => {
    if (isLoading) return;

    const isRemoving = currentReaction === reactionType;

    setIsLoading(true);
    try {
      if (isRemoving) {
        // Remove reaction
        const response = await fetch(`/api/stories/${storyId}/reactions`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setCurrentReaction(null);
          onReactionChange?.(null);
        }
      } else {
        // Add/update reaction
        const response = await fetch(`/api/stories/${storyId}/reactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reactionType }),
        });

        if (response.ok) {
          setCurrentReaction(reactionType);
          onReactionChange?.(reactionType);
        }
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const currentReactionData = REACTIONS.find((r) => r.type === currentReaction);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-12 w-12 rounded-full bg-white/20 text-white hover:bg-white/30',
            currentReaction && 'bg-white/30'
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (currentReaction) {
              // Quick toggle: if already reacted, remove on click
              handleReaction(currentReaction);
            } else {
              setIsOpen(true);
            }
          }}
        >
          {currentReactionData ? (
            <div className={cn('flex items-center justify-center', currentReactionData.color)}>
              {currentReactionData.icon}
            </div>
          ) : (
            <Heart className="h-6 w-6" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2">
          {REACTIONS.map((reaction) => (
            <Button
              key={reaction.type}
              variant="ghost"
              size="icon"
              className={cn(
                'h-10 w-10 rounded-full hover:bg-muted',
                currentReaction === reaction.type && 'bg-muted'
              )}
              onClick={() => handleReaction(reaction.type)}
              disabled={isLoading}
            >
              <div className={cn('flex items-center justify-center', reaction.color)}>{reaction.icon}</div>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

