'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Post } from '@/lib/data';

export function FeedPreview() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPreviewPosts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/feed/list?limit=6');
        if (response.ok) {
          const data = await response.json();
          // Convert ISO strings back to Date objects
          const postsWithDates = (data.posts || []).slice(0, 6).map((post: any) => ({
            ...post,
            createdAt: new Date(post.createdAt),
            updatedAt: new Date(post.updatedAt),
            media: (post.media || []).map((m: any) => ({
              ...m,
              createdAt: new Date(m.createdAt),
            })),
          }));
          setPosts(postsWithDates);
        }
      } catch (error) {
        console.error('Error fetching feed preview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreviewPosts();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 sm:py-8">
        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-4 sm:py-6 px-2 sm:px-4">
        <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
          Nenhuma publicação ainda
        </p>
        <Button asChild size="sm" className="w-full text-xs sm:text-sm">
          <Link href="/feed">
            Ver Feed
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Grid de previews */}
      <div className="grid grid-cols-3 gap-1 sm:gap-1.5 md:gap-2">
        {posts.slice(0, 6).map((post) => {
          const firstImage = post.media[0];
          if (!firstImage) return null;

          return (
            <Link
              key={post.id}
              href="/feed"
              className="relative aspect-square rounded-md sm:rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-all duration-200 group cursor-pointer"
            >
              <Image
                src={firstImage.mediaUrl}
                alt={post.description || 'Post'}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                sizes="(max-width: 640px) 33vw, 150px"
              />
              {/* Overlay com stats */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-1 text-white text-[10px] sm:text-xs">
                  <Heart className={cn('h-2.5 w-2.5 sm:h-3 sm:w-3', post.isLiked && 'fill-current')} />
                  <span className="font-semibold">{post.likesCount || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-white text-[10px] sm:text-xs">
                  <MessageCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span className="font-semibold">{post.commentsCount || 0}</span>
                </div>
              </div>
              {/* Indicador de múltiplas imagens */}
              {post.media.length > 1 && (
                <div className="absolute top-1 right-1">
                  <svg
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white drop-shadow-lg"
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
            </Link>
          );
        })}
      </div>

      {/* Botão para ver feed completo */}
      <Button asChild size="sm" variant="outline" className="w-full text-xs sm:text-sm mt-2 sm:mt-3">
        <Link href="/feed">
          Ver Feed Completo
        </Link>
      </Button>
    </div>
  );
}

