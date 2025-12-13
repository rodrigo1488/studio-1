'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import type { Story, User } from '@/lib/data';
import { StoryViewer } from './story-viewer';

interface StoriesCarouselProps {
  currentUserId: string;
}

export function StoriesCarousel({ currentUserId }: StoriesCarouselProps) {
  const [storiesByUser, setStoriesByUser] = useState<Record<string, Story[]>>({});
  const [users, setUsers] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<{ stories: Story[]; initialIndex: number } | null>(null);

  useEffect(() => {
    async function fetchStories() {
      try {
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
    }

    fetchStories();
  }, []);

  const handleStoryClick = (userId: string) => {
    const userStories = storiesByUser[userId];
    if (userStories && userStories.length > 0) {
      setSelectedStory({
        stories: userStories,
        initialIndex: 0,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-shrink-0">
            <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  const userIds = Object.keys(storiesByUser);

  if (userIds.length === 0) {
    return null;
  }

  return (
    <>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-2">
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
                className="flex flex-shrink-0 flex-col items-center gap-1.5"
              >
                <div
                  className={cn(
                    'relative flex h-16 w-16 items-center justify-center rounded-full p-0.5',
                    hasUnviewed
                      ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500'
                      : 'bg-muted'
                  )}
                >
                  <Avatar className="h-full w-full border-2 border-background">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                </div>
                <span className="max-w-[70px] truncate text-xs text-muted-foreground">{user.name}</span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {selectedStory && (
        <StoryViewer
          stories={selectedStory.stories}
          initialIndex={selectedStory.initialIndex}
          currentUserId={currentUserId}
          onClose={() => setSelectedStory(null)}
        />
      )}
    </>
  );
}

