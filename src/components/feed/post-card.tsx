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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.user?.avatarUrl} />
                <AvatarFallback>{getInitials(post.user?.name || 'U')}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{post.user?.name || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
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
          <div className="relative aspect-square w-full bg-muted">
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
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white"
                      onClick={handlePreviousImage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white"
                      onClick={handleNextImage}
                    >
                      <ChevronRight className="h-4 w-4" />
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
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-9 w-9', isLiked && 'text-red-500')}
                onClick={handleLike}
                disabled={isLiking}
              >
                <Heart className={cn('h-6 w-6', isLiked && 'fill-current')} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowModal(true)}
              >
                <MessageCircle className="h-6 w-6" />
              </Button>
            </div>

            {likesCount > 0 && (
              <p className="text-sm font-semibold">{likesCount} curtida{likesCount !== 1 ? 's' : ''}</p>
            )}

            {post.description && (
              <div className="text-sm">
                <span className="font-semibold">{post.user?.name || 'Usuário'}</span>{' '}
                <span>{post.description}</span>
              </div>
            )}

            {post.commentsCount && post.commentsCount > 0 && (
              <Button
                variant="ghost"
                className="text-muted-foreground p-0 h-auto font-normal"
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

