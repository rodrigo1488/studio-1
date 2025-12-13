'use client';

import { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import type { Story } from '@/lib/data';
import Image from 'next/image';

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  currentUserId: string;
  onClose: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per story

export function StoryViewer({ stories, initialIndex, currentUserId, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const storyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pausedProgressRef = useRef<number>(0);

  const currentStory = stories[currentIndex];

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
    if (!currentStory || isPaused) return;

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
  }, [currentIndex, isPaused, currentStory]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      pausedProgressRef.current = 0;
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      pausedProgressRef.current = 0;
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

  if (!currentStory) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onClick={handlePause}
    >
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-1">
        {stories.map((_, index) => (
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

      {/* Story content */}
      <div className="relative h-full w-full max-w-md">
        {currentStory.mediaType === 'image' ? (
          <Image
            src={currentStory.mediaUrl}
            alt="Story"
            fill
            className="object-contain"
            unoptimized
          />
        ) : (
          <video
            src={currentStory.mediaUrl}
            className="h-full w-full object-contain"
            autoPlay
            loop
            muted
            playsInline
          />
        )}
      </div>

      {/* Navigation buttons */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation();
          handlePrevious();
        }}
        disabled={currentIndex === 0}
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
        disabled={currentIndex === stories.length - 1}
      >
        <ChevronRight className="h-8 w-8" />
      </Button>

      {/* Pause indicator */}
      {isPaused && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2">
          <p className="text-sm text-white">Pausado</p>
        </div>
      )}
    </div>
  );
}

