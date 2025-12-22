'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Post } from '@/lib/data';
import { Heart, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PostGridItemProps {
  post: Post;
  currentUserId: string;
  onLike: (postId: string) => Promise<void>;
  onDelete?: (postId: string) => void;
  onEdit?: (postId: string) => void;
}

export function PostGridItem({ post, currentUserId, onLike, onDelete, onEdit }: PostGridItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  const firstImage = post.media[0];
  const hasMultipleImages = post.media.length > 1;

  if (!firstImage) return null;

  return (
    <>
      <div
        className="relative aspect-square w-full cursor-pointer group overflow-hidden rounded-md sm:rounded-lg"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => router.push(`/feed/${post.id}`)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
      >
        <Image
          src={firstImage.mediaUrl}
          alt={post.description || 'Post image'}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
        />

        {/* Overlay on hover - apenas desktop */}
        <div
          className={cn(
            'absolute inset-0 bg-black/40 hidden sm:flex items-center justify-center gap-4 sm:gap-6 transition-opacity',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="flex items-center gap-2 text-white">
            <Heart className={cn('h-6 w-6', post.isLiked && 'fill-current')} />
            <span className="font-semibold">{post.likesCount || 0}</span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <MessageCircle className="h-6 w-6" />
            <span className="font-semibold">{post.commentsCount || 0}</span>
          </div>
        </div>

        {/* Multiple images indicator */}
        {hasMultipleImages && (
          <div className="absolute top-2 right-2">
            <svg
              className="w-6 h-6 text-white drop-shadow-lg"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
    </>
  );
}

