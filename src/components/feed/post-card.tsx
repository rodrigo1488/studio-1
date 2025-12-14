'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, MoreVertical, ChevronLeft, ChevronRight, User, Share2, Bookmark } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getInitials, cn } from '@/lib/utils';
import type { Post } from '@/lib/data';
import Image from 'next/image';
import Link from 'next/link';
import { PostModal } from './post-modal';
import { SharePostDialog } from './share-post-dialog';
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
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const previousSaved = isSaved;

    // Optimistic update
    setIsSaved(!isSaved);

    try {
      const method = isSaved ? 'DELETE' : 'POST';
      const response = await fetch(`/api/feed/${post.id}/save`, {
        method,
      });

      if (!response.ok) {
        throw new Error('Failed to toggle save');
      }
    } catch (error) {
      // Revert on error
      setIsSaved(previousSaved);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="w-full overflow-hidden border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-slide-in">
        <CardHeader className="pb-1.5 sm:pb-2 md:pb-3 px-2 sm:px-3 md:px-4 lg:px-6 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <Link 
              href={`/profile/${post.userId}`}
              className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
            >
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 shrink-0 ring-2 ring-primary/20">
                <AvatarImage src={post.user?.avatarUrl} />
                <AvatarFallback className="text-[10px] sm:text-xs bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                  {getInitials(post.user?.name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[11px] sm:text-xs md:text-sm truncate text-foreground hover:underline">{post.user?.name || 'Usuário'}</p>
                <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground truncate">
                  {formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </Link>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 shrink-0 touch-manipulation">
                    <MoreVertical className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
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
          <div className="p-2 sm:p-3 md:p-4 lg:p-6 space-y-1.5 sm:space-y-2 md:space-y-3 bg-gradient-to-b from-background to-muted/20">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 touch-manipulation transition-all duration-200',
                  isLiked 
                    ? 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950' 
                    : 'hover:text-red-500 hover:bg-muted'
                )}
                onClick={handleLike}
                disabled={isLiking}
                aria-label={isLiked ? 'Descurtir' : 'Curtir'}
              >
                <Heart className={cn('h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-transform', isLiked && 'fill-current scale-110')} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 touch-manipulation hover:text-primary hover:bg-muted transition-all duration-200"
                onClick={() => setShowModal(true)}
                aria-label="Comentar"
              >
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 touch-manipulation hover:text-primary hover:bg-muted transition-all duration-200"
                onClick={() => setShowShareDialog(true)}
                aria-label="Compartilhar"
              >
                <Share2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 touch-manipulation transition-all duration-200',
                  isSaved
                    ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950'
                    : 'hover:text-yellow-500 hover:bg-muted'
                )}
                onClick={handleSave}
                disabled={isSaving}
                aria-label={isSaved ? 'Remover dos salvos' : 'Salvar'}
              >
                <Bookmark className={cn('h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-transform', isSaved && 'fill-current')} />
              </Button>
            </div>

            {likesCount > 0 && (
              <p className="text-[10px] sm:text-xs md:text-sm font-semibold text-foreground">
                {likesCount} curtida{likesCount !== 1 ? 's' : ''}
              </p>
            )}

            {post.description && (
              <div className="text-[11px] sm:text-xs md:text-sm lg:text-base leading-relaxed space-y-1 break-words">
                <div>
                  <Link 
                    href={`/profile/${post.userId}`}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {post.user?.name || 'Usuário'}
                  </Link>{' '}
                  <span className="text-foreground/90 break-words">{post.description}</span>
                </div>
              </div>
            )}

            {/* Mentions */}
            {post.mentions && post.mentions.length > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-1 border-t border-border/50">
                <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-primary shrink-0" />
                <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground font-medium">
                  Marcado{post.mentions.length !== 1 ? 's' : ''}:
                </span>
                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-wrap">
                  {post.mentions.map((mention, index) => (
                    <Link
                      key={mention.id}
                      href={`/profile/${mention.userId}`}
                      className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-primary hover:underline cursor-pointer transition-colors"
                    >
                      {mention.user?.name || 'Usuário'}
                      {index < post.mentions!.length - 1 && <span className="text-muted-foreground">,</span>}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {post.commentsCount && post.commentsCount > 0 && (
              <Button
                variant="ghost"
                className="text-muted-foreground p-0 h-auto font-normal text-[10px] sm:text-xs md:text-sm hover:text-primary touch-manipulation"
                onClick={() => setShowModal(true)}
              >
                Ver {post.commentsCount} comentário{post.commentsCount !== 1 ? 's' : ''}
              </Button>
            )}
            
            {(!post.commentsCount || post.commentsCount === 0) && (
              <Button
                variant="ghost"
                className="text-muted-foreground p-0 h-auto font-normal text-[10px] sm:text-xs md:text-sm hover:text-primary touch-manipulation"
                onClick={() => setShowModal(true)}
              >
                Comentar
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

