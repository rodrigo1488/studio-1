'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getInitials, cn } from '@/lib/utils';
import type { Post } from '@/lib/data';
import Image from 'next/image';
import { PostModal } from './post-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onLike: (postId: string) => Promise<void>;
  onDelete?: (postId: string) => void;
  onEdit?: (postId: string) => void;
}

export function PostCard({ post, currentUserId, onLike, onDelete, onEdit }: PostCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [showModal, setShowModal] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Ensure createdAt is a Date object
  const createdAt = post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt);

  const isOwner = post.userId === currentUserId;
  const hasMultipleImages = post.media.length > 1;

  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    const previousLiked = isLiked;
    const previousCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(previousLiked ? likesCount - 1 : likesCount + 1);

    try {
      await onLike(post.id);
    } catch (error) {
      // Revert on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handlePreviousImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + post.media.length) % post.media.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % post.media.length);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                <AvatarImage src={post.user?.avatarUrl} />
                <AvatarFallback className="text-xs">{getInitials(post.user?.name || 'U')}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs sm:text-sm truncate">{post.user?.name || 'Usuário'}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                    <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(post.id)}>
                      Editar
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(post.id)}
                      className="text-destructive"
                    >
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Image Carousel */}
          <div className="relative aspect-square sm:aspect-video w-full bg-muted">
            {post.media.length > 0 && (
              <>
                <Image
                  src={post.media[currentImageIndex].mediaUrl}
                  alt={post.description || 'Post image'}
                  fill
                  className="object-cover cursor-pointer"
                  onClick={() => setShowModal(true)}
                />
                {hasMultipleImages && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-black/50 hover:bg-black/70 text-white touch-manipulation"
                      onClick={handlePreviousImage}
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-black/50 hover:bg-black/70 text-white touch-manipulation"
                      onClick={handleNextImage}
                    >
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {post.media.map((_, index) => (
                        <div
                          key={index}
                          className={cn(
                            'h-1.5 rounded-full transition-all',
                            index === currentImageIndex
                              ? 'w-6 bg-white'
                              : 'w-1.5 bg-white/50'
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="p-2 sm:p-4 space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8 sm:h-9 sm:w-9 touch-manipulation', isLiked && 'text-red-500')}
                onClick={handleLike}
                disabled={isLiking}
              >
                <Heart className={cn('h-5 w-5 sm:h-6 sm:w-6', isLiked && 'fill-current')} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation"
                onClick={() => setShowModal(true)}
              >
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </div>

            {likesCount > 0 && (
              <p className="text-xs sm:text-sm font-semibold">{likesCount} curtida{likesCount !== 1 ? 's' : ''}</p>
            )}

            {post.description && (
              <div className="text-xs sm:text-sm leading-relaxed">
                <span className="font-semibold">{post.user?.name || 'Usuário'}</span>{' '}
                <span className="break-words">{post.description}</span>
              </div>
            )}

            {post.commentsCount && post.commentsCount > 0 && (
              <Button
                variant="ghost"
                className="text-muted-foreground p-0 h-auto font-normal text-xs sm:text-sm"
                onClick={() => setShowModal(true)}
              >
                Ver todos os {post.commentsCount} comentário{post.commentsCount !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showModal && (
        <PostModal
          post={post}
          currentUserId={currentUserId}
          onClose={() => setShowModal(false)}
          onLike={onLike}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      )}
    </>
  );
}

