'use client';

import { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import type { Story } from '@/lib/data';
import Image from 'next/image';
import { StoryReactions } from './story-reactions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface StoryViewerProps {
  allStoriesByUser: Record<string, Story[]>;
  initialUserId: string;
  initialIndex: number;
  currentUserId: string;
  onClose: () => void;
  onStoryDeleted?: (storyId: string) => void;
}

const STORY_DURATION = 5000; // 5 seconds per story
const PRELOAD_COUNT = 5; // Number of stories to preload

export function StoryViewer({
  allStoriesByUser,
  initialUserId,
  initialIndex,
  currentUserId,
  onClose,
  onStoryDeleted,
}: StoryViewerProps) {
  const [currentUserIdState, setCurrentUserIdState] = useState(initialUserId);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [loadedStories, setLoadedStories] = useState<Set<string>>(new Set());
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const storyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pausedProgressRef = useRef<number>(0);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserStories = allStoriesByUser[currentUserIdState] || [];
  const currentStory = currentUserStories[currentIndex];
  const isOwner = currentStory?.userId === currentUserId;
  const { toast } = useToast();

  // Preload first 5 stories
  useEffect(() => {
    const userIds = Object.keys(allStoriesByUser);
    let preloadCount = 0;

    const preloadStory = (story: Story) => {
      if (preloadCount >= PRELOAD_COUNT || loadedStories.has(story.id)) return;

      const img = new window.Image();
      img.onload = () => {
        setLoadedStories((prev) => new Set(prev).add(story.id));
        preloadCount++;
      };
      img.src = story.mediaUrl;
    };

    // Preload stories from current user first
    currentUserStories.slice(0, PRELOAD_COUNT).forEach(preloadStory);

    // Then preload from other users
    userIds.forEach((userId) => {
      if (userId === currentUserIdState || preloadCount >= PRELOAD_COUNT) return;
      allStoriesByUser[userId].slice(0, PRELOAD_COUNT - preloadCount).forEach(preloadStory);
    });
  }, [allStoriesByUser, currentUserIdState, currentUserStories, loadedStories]);

  // Load reactions for current story
  useEffect(() => {
    if (!currentStory) return;

    fetch(`/api/stories/${currentStory.id}/reactions`)
      .then((res) => res.json())
      .then((data) => {
        if (data.reactions) {
          const userReaction = data.reactions.find((r: any) => r.userId === currentUserId);
          if (userReaction) {
            setUserReactions((prev) => ({
              ...prev,
              [currentStory.id]: userReaction.reactionType,
            }));
          }
        }
      })
      .catch(console.error);
  }, [currentStory?.id, currentUserId]);

  // Mark story as viewed when displayed
  useEffect(() => {
    if (currentStory) {
      fetch(`/api/stories/${currentStory.id}/view`, {
        method: 'POST',
      }).catch(console.error);
    }
  }, [currentStory?.id]);

  // Progress bar animation
  useEffect(() => {
    if (!currentStory || isPaused || isHolding) return;

    const startProgress = pausedProgressRef.current;
    startTimeRef.current = Date.now();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min(100, startProgress + (elapsed / STORY_DURATION) * 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        handleNext();
      }
    }, 50);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentIndex, isPaused, isHolding, currentStory]);

  const handleNext = () => {
    if (currentIndex < currentUserStories.length - 1) {
      // Next story from same user
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      pausedProgressRef.current = 0;
    } else {
      // Move to next user
      const userIds = Object.keys(allStoriesByUser);
      const currentUserIndex = userIds.indexOf(currentUserIdState);
      const nextUserIndex = currentUserIndex + 1;

      if (nextUserIndex < userIds.length) {
        setCurrentUserIdState(userIds[nextUserIndex]);
        setCurrentIndex(0);
        setProgress(0);
        pausedProgressRef.current = 0;
      } else {
        // No more users, close
        onClose();
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      // Previous story from same user
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      pausedProgressRef.current = 0;
    } else {
      // Move to previous user
      const userIds = Object.keys(allStoriesByUser);
      const currentUserIndex = userIds.indexOf(currentUserIdState);
      const previousUserIndex = currentUserIndex - 1;

      if (previousUserIndex >= 0) {
        const previousUserStories = allStoriesByUser[userIds[previousUserIndex]];
        setCurrentUserIdState(userIds[previousUserIndex]);
        setCurrentIndex(previousUserStories.length - 1);
        setProgress(0);
        pausedProgressRef.current = 0;
      }
    }
  };

  const handlePause = () => {
    if (isPaused) {
      // Resume
      pausedProgressRef.current = progress;
      setIsPaused(false);
    } else {
      // Pause
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setIsPaused(true);
    }
  };

  const handleHoldStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsHolding(true);
    handlePause();
  };

  const handleHoldEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsHolding(false);
    handlePause();
  };

  const handleSkip = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      handleNext();
    } else {
      handlePrevious();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key === ' ') {
      e.preventDefault();
      handlePause();
    }
  };

  const handleReactionChange = (reaction: string | null) => {
    if (currentStory) {
      setUserReactions((prev) => {
        const newReactions = { ...prev };
        if (reaction) {
          newReactions[currentStory.id] = reaction;
        } else {
          delete newReactions[currentStory.id];
        }
        return newReactions;
      });

      // Trigger notification (will be handled by notification system)
      if (reaction && currentStory.userId !== currentUserId) {
        // Create notification event
        const event = new CustomEvent('storyReaction', {
          detail: {
            storyId: currentStory.id,
            storyUserId: currentStory.userId,
            reactionType: reaction,
            userId: currentUserId,
          },
        });
        window.dispatchEvent(event);
      }
    }
  };

  if (!currentStory) return null;

  const isLoaded = loadedStories.has(currentStory.id);
  const allUserStories = Object.values(allStoriesByUser).flat();
  const currentGlobalIndex = allUserStories.findIndex((s) => s.id === currentStory.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onClick={handlePause}
      onMouseDown={handleHoldStart}
      onMouseUp={handleHoldEnd}
      onMouseLeave={handleHoldEnd}
      onTouchStart={handleHoldStart}
      onTouchEnd={handleHoldEnd}
    >
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-1">
        {currentUserStories.map((_, index) => (
          <div
            key={index}
            className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
          >
            <div
              className={cn(
                'h-full bg-white transition-all duration-75',
                index < currentIndex && 'w-full',
                index === currentIndex && 'w-full',
                index > currentIndex && 'w-0'
              )}
              style={{
                width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-white">
          <AvatarImage src={currentStory.user?.avatarUrl} alt={currentStory.user?.name} />
          <AvatarFallback>{getInitials(currentStory.user?.name || '')}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-white">{currentStory.user?.name}</p>
          <p className="text-xs text-white/70">
            {new Date(currentStory.createdAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm('Tem certeza que deseja excluir esta story?')) return;
                    
                    try {
                      const response = await fetch(`/api/stories/${currentStory.id}`, {
                        method: 'DELETE',
                      });
                      
                      if (response.ok) {
                        toast({
                          title: 'Story excluída',
                          description: 'A story foi excluída com sucesso.',
                        });
                        
                        // Notificar o componente pai sobre a exclusão
                        if (onStoryDeleted) {
                          onStoryDeleted(currentStory.id);
                        }
                        
                        // Se era a última story do usuário, fechar o viewer
                        if (currentUserStories.length === 1) {
                          onClose();
                        } else {
                          // Remover a story da lista local e ir para a próxima/anterior
                          const newStories = currentUserStories.filter(s => s.id !== currentStory.id);
                          if (newStories.length > 0) {
                            if (currentIndex >= newStories.length) {
                              setCurrentIndex(newStories.length - 1);
                            }
                            // Atualizar o estado local
                            const updated = { ...allStoriesByUser };
                            updated[currentUserIdState] = newStories;
                            // Não precisamos atualizar allStoriesByUser aqui pois o componente pai fará isso
                          } else {
                            // Se não há mais stories, fechar
                            onClose();
                          }
                        }
                        
                        // Recarregar a página para atualizar o carousel
                        setTimeout(() => {
                          window.location.reload();
                        }, 500);
                      } else {
                        throw new Error('Failed to delete story');
                      }
                    } catch (error) {
                      console.error('Error deleting story:', error);
                      toast({
                        title: 'Erro',
                        description: 'Não foi possível excluir a story.',
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Story content */}
      <div className="relative h-full w-full max-w-md">
        {!isLoaded ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          </div>
        ) : currentStory.mediaType === 'image' ? (
          <Image
            src={currentStory.mediaUrl}
            alt="Story"
            fill
            className="object-contain"
            unoptimized
            priority={currentGlobalIndex < PRELOAD_COUNT}
          />
        ) : (
          <video
            src={currentStory.mediaUrl}
            className="h-full w-full object-contain"
            autoPlay
            loop={false}
            muted
            playsInline
            onEnded={handleNext}
          />
        )}
      </div>

      {/* Navigation areas - tap left/right to skip */}
      <div
        className="absolute left-0 top-0 h-full w-1/2"
        onClick={(e) => {
          e.stopPropagation();
          handleSkip('left');
        }}
      />
      <div
        className="absolute right-0 top-0 h-full w-1/2"
        onClick={(e) => {
          e.stopPropagation();
          handleSkip('right');
        }}
      />

      {/* Navigation buttons */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation();
          handlePrevious();
        }}
        disabled={currentIndex === 0 && Object.keys(allStoriesByUser).indexOf(currentUserIdState) === 0}
      >
        <ChevronLeft className="h-8 w-8" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
      >
        <ChevronRight className="h-8 w-8" />
      </Button>

      {/* Reactions button */}
      <div className="absolute bottom-8 right-4 z-10" onClick={(e) => e.stopPropagation()}>
        <StoryReactions
          storyId={currentStory.id}
          currentUserId={currentUserId}
          initialReaction={userReactions[currentStory.id] as any}
          onReactionChange={handleReactionChange}
        />
      </div>

      {/* Pause/Hold indicator */}
      {(isPaused || isHolding) && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2">
          <p className="text-sm text-white">{isHolding ? 'Segurando...' : 'Pausado'}</p>
        </div>
      )}
    </div>
  );
}
