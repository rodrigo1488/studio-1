'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import type { Story, User } from '@/lib/data';
import { StoryViewer } from './story-viewer';
import { Plus } from 'lucide-react';

interface StoriesCarouselProps {
  currentUserId: string;
  onCreateStory?: () => void;
}

export function StoriesCarousel({ currentUserId, onCreateStory }: StoriesCarouselProps) {
  const [storiesByUser, setStoriesByUser] = useState<Record<string, Story[]>>({});
  const [users, setUsers] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<{ stories: Story[]; initialIndex: number; userId: string } | null>(null);

  const fetchStories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/stories/list');
      if (response.ok) {
        const data = await response.json();
        const stories: Story[] = data.stories.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          expiresAt: new Date(s.expiresAt),
        }));

        // Group by user
        const grouped: Record<string, Story[]> = {};
        const usersMap: Record<string, User> = {};

        stories.forEach((story) => {
          if (!grouped[story.userId]) {
            grouped[story.userId] = [];
          }
          grouped[story.userId].push(story);

          if (story.user && !usersMap[story.userId]) {
            usersMap[story.userId] = story.user;
          }
        });

        // Sort stories within each user by creation date (newest first)
        Object.keys(grouped).forEach((userId) => {
          grouped[userId].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        });

        setStoriesByUser(grouped);
        setUsers(usersMap);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleStoryClick = (userId: string) => {
    const userStories = storiesByUser[userId];
    if (userStories && userStories.length > 0) {
      setSelectedStory({
        stories: userStories,
        initialIndex: 0,
        userId,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-shrink-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  const userIds = Object.keys(storiesByUser);

  // if (userIds.length === 0) {
  //   return null;
  // }

  return (
    <>
      <div className="flex gap-2 sm:gap-2.5 md:gap-3 py-2">
        {/* Botão de criar story - fixo à esquerda */}
        {onCreateStory && (
          <button
            onClick={onCreateStory}
            className="flex flex-shrink-0 flex-col items-center gap-1 sm:gap-1.5 touch-manipulation z-10 bg-background"
            aria-label="Criar story"
          >
            <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-full p-0.5 bg-muted border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors">
              <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                <Plus className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-muted-foreground" />
              </div>
            </div>
            <span className="max-w-[60px] sm:max-w-[70px] md:max-w-[80px] truncate text-[10px] sm:text-xs text-muted-foreground">Criar</span>
          </button>
        )}

        {userIds.length > 0 && (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 sm:gap-2.5 md:gap-3 pr-4">
              {userIds.map((userId) => {
                const userStories = storiesByUser[userId];
                const user = users[userId];
                const hasUnviewed = userStories.some((s) => !s.isViewed);
                const latestStory = userStories[0];

                if (!user || !latestStory) return null;

                return (
                  <button
                    key={userId}
                    onClick={() => handleStoryClick(userId)}
                    className="flex flex-shrink-0 flex-col items-center gap-1 sm:gap-1.5 touch-manipulation"
                    aria-label={`Ver stories de ${user.name}`}
                  >
                    <div
                      className={cn(
                        'relative flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-full p-0.5',
                        hasUnviewed
                          ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500'
                          : 'bg-muted'
                      )}
                    >
                      <Avatar className="h-full w-full border-2 border-background">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="text-[9px] sm:text-[10px] md:text-xs">{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="max-w-[60px] sm:max-w-[70px] md:max-w-[80px] truncate text-[10px] sm:text-xs text-muted-foreground">{user.name}</span>
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        )}
      </div>

      {selectedStory && (
        <StoryViewer
          allStoriesByUser={storiesByUser}
          initialUserId={selectedStory.userId}
          initialIndex={selectedStory.initialIndex}
          currentUserId={currentUserId}
          onClose={() => {
            setSelectedStory(null);
          }}
          onStoryDeleted={(storyId) => {
            // Remover a story do estado local
            const updated = { ...storiesByUser };
            if (updated[selectedStory.userId]) {
              updated[selectedStory.userId] = updated[selectedStory.userId].filter(s => s.id !== storyId);
              if (updated[selectedStory.userId].length === 0) {
                delete updated[selectedStory.userId];
                setSelectedStory(null);
              }
            }
            setStoriesByUser(updated);
          }}
        />
      )}
    </>
  );
}

