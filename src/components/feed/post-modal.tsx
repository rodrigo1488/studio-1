'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, MessageCircle, Send, ChevronLeft, ChevronRight, MoreVertical, X, ThumbsUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getInitials, cn } from '@/lib/utils';
import type { Post, PostComment } from '@/lib/data';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PostModalProps {
  post: Post;
  currentUserId: string;
  onClose: () => void;
  onLike: (postId: string) => Promise<void>;
  onDelete?: (postId: string) => void;
  onEdit?: (postId: string) => void;
}

export function PostModal({ post, currentUserId, onClose, onLike, onDelete, onEdit }: PostModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);

  // Ensure createdAt is a Date object
  const createdAt = post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt);

  const isOwner = post.userId === currentUserId;
  const hasMultipleImages = post.media.length > 1;

  useEffect(() => {
    loadComments();
  }, [post.id]);

  const loadComments = async () => {
    try {
      setIsLoadingComments(true);
      const response = await fetch(`/api/feed/${post.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        // Convert ISO strings back to Date objects
        const commentsWithDates = (data.comments || []).map((comment: any) => ({
          ...comment,
          createdAt: comment.createdAt instanceof Date ? comment.createdAt : new Date(comment.createdAt),
          updatedAt: comment.updatedAt instanceof Date ? comment.updatedAt : new Date(comment.updatedAt),
        }));
        setComments(commentsWithDates);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

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

  const handleSubmitComment = async () => {
    if (!commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const tempComment: PostComment = {
      id: `temp-${Date.now()}`,
      postId: post.id,
      userId: currentUserId,
      text: commentText.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Optimistic update
    setComments((prev) => [...prev, tempComment]);
    setCommentText('');
    setCommentsCount((prev) => prev + 1);

    try {
      const response = await fetch(`/api/feed/${post.id}/comments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        const newComment = {
          ...data.comment,
          createdAt: new Date(data.comment.createdAt),
          updatedAt: new Date(data.comment.updatedAt),
        };
        setComments((prev) => prev.map((c) => (c.id === tempComment.id ? newComment : c)));
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        // Revert on error
        setComments((prev) => prev.filter((c) => c.id !== tempComment.id));
        setCommentsCount((prev) => prev - 1);
        alert(errorData.error || 'Erro ao enviar comentário');
      }
    } catch (error) {
      // Revert on error
      setComments((prev) => prev.filter((c) => c.id !== tempComment.id));
      setCommentsCount((prev) => prev - 1);
      alert('Erro ao enviar comentário. Tente novamente.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + post.media.length) % post.media.length);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % post.media.length);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] sm:max-h-[95vh] p-0 gap-0 w-[95vw] md:w-full h-full sm:h-auto overflow-hidden !mx-0">
        <DialogTitle className="sr-only">
          Post de {post.user?.name || 'Usuário'}
        </DialogTitle>
        <div className="flex flex-col md:flex-row h-[100vh] sm:h-[90vh] max-h-[90vh] sm:max-h-[95vh]">
          {/* Image Section */}
          <div className="relative flex-1 bg-black flex items-center justify-center min-w-0 overflow-hidden">
            {post.media.length > 0 && (
              <>
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src={post.media[currentImageIndex].mediaUrl}
                    alt={post.description || 'Post image'}
                    width={800}
                    height={800}
                    className="object-contain"
                    style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
                  />
                </div>
                {hasMultipleImages && (
                  <>
                    <Button
                      variant="ghost"
                      size="lg"
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg border-2 border-white/20 backdrop-blur-sm transition-all"
                      onClick={handlePreviousImage}
                      aria-label="Imagem anterior"
                    >
                      <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg border-2 border-white/20 backdrop-blur-sm transition-all"
                      onClick={handleNextImage}
                      aria-label="Próxima imagem"
                    >
                      <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      {post.media.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={cn(
                            'h-2.5 sm:h-3 rounded-full transition-all duration-300',
                            index === currentImageIndex
                              ? 'w-8 sm:w-10 bg-white shadow-md'
                              : 'w-2.5 sm:w-3 bg-white/50 hover:bg-white/70'
                          )}
                          aria-label={`Imagem ${index + 1} de ${post.media.length}`}
                        />
                      ))}
                    </div>
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium">
                      {currentImageIndex + 1} / {post.media.length}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Content Section */}
          <div className="flex flex-col w-full md:w-96 border-t md:border-t-0 md:border-l">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b bg-background/50 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-primary/20">
                  <AvatarImage src={post.user?.avatarUrl} />
                  <AvatarFallback className="text-sm sm:text-base font-semibold">
                    {getInitials(post.user?.name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base truncate">{post.user?.name || 'Usuário'}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 sm:h-10 sm:w-10 hover:bg-muted"
                      aria-label="Opções do post"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(post.id)}>
                        ✏️ Editar post
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(post.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        🗑️ Excluir post
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Description */}
            {post.description && (
              <div className="p-4 sm:p-5 border-b bg-background/30">
                <div className="text-sm sm:text-base leading-relaxed">
                  <span className="font-semibold text-foreground">{post.user?.name || 'Usuário'}</span>{' '}
                  <span className="text-foreground/90">{post.description}</span>
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="flex flex-col flex-1 min-h-0 bg-background">
              <div className="px-4 sm:px-5 py-3 sm:py-4 border-b bg-muted/30">
                <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  {commentsCount > 0 ? (
                    <span>{commentsCount} comentário{commentsCount !== 1 ? 's' : ''}</span>
                  ) : (
                    <span>Comentários</span>
                  )}
                </h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
                  {isLoadingComments ? (
                    <div className="text-center text-muted-foreground py-12">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mb-2" />
                      <p className="text-sm">Carregando comentários...</p>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm sm:text-base font-medium mb-1">Nenhum comentário ainda</p>
                      <p className="text-xs sm:text-sm">Seja o primeiro a comentar!</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 sm:gap-4 pb-4 sm:pb-5 border-b last:border-0 last:pb-0">
                        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 ring-2 ring-primary/10">
                          <AvatarImage src={comment.user?.avatarUrl} />
                          <AvatarFallback className="text-xs sm:text-sm font-semibold">
                            {getInitials(comment.user?.name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm sm:text-base font-semibold">{comment.user?.name || 'Usuário'}</span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground">
                                  {formatDistanceToNow(comment.createdAt, { addSuffix: true, locale: ptBR })}
                                </span>
                              </div>
                              <p className="text-sm sm:text-base mt-1 break-words leading-relaxed text-foreground/90">
                                {comment.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Actions */}
            <div className="p-4 sm:p-5 border-t space-y-3 sm:space-y-4 bg-background">
              {/* Like and Comment Count */}
              <div className="flex items-center gap-4 sm:gap-5">
                <Button
                  variant="ghost"
                  size="lg"
                  className={cn(
                    'h-11 w-11 sm:h-12 sm:w-12 rounded-full touch-manipulation transition-all',
                    'hover:scale-110 active:scale-95',
                    isLiked 
                      ? 'text-red-500 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50' 
                      : 'hover:bg-muted'
                  )}
                  onClick={handleLike}
                  disabled={isLiking}
                  aria-label={isLiked ? 'Descurtir' : 'Curtir'}
                >
                  <Heart className={cn('h-6 w-6 sm:h-7 sm:w-7 transition-all', isLiked && 'fill-current scale-110')} />
                </Button>
                <div className="flex items-center gap-2 text-base sm:text-lg">
                  <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                  <span className="font-semibold">{commentsCount}</span>
                  <span className="text-sm sm:text-base text-muted-foreground">comentários</span>
                </div>
              </div>

              {likesCount > 0 && (
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <ThumbsUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <p className="font-semibold">
                    {likesCount} pessoa{likesCount !== 1 ? 's' : ''} curti{likesCount !== 1 ? 'ram' : 'u'}
                  </p>
                </div>
              )}

              {/* Comment Input */}
              <div className="space-y-2">
                <label htmlFor="comment-input" className="text-xs sm:text-sm font-medium text-muted-foreground block">
                  Adicionar comentário
                </label>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <Textarea
                      id="comment-input"
                      placeholder="Escreva seu comentário aqui..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                      className="min-h-[60px] sm:min-h-[70px] max-h-[140px] resize-none pr-12 sm:pr-14 text-sm sm:text-base border-2 focus:border-primary transition-colors"
                      rows={3}
                    />
                    <Button
                      size="icon"
                      className={cn(
                        'absolute bottom-2 right-2 h-8 w-8 sm:h-9 sm:w-9 transition-all',
                        commentText.trim() 
                          ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:scale-110' 
                          : 'bg-muted text-muted-foreground'
                      )}
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || isSubmittingComment}
                      aria-label="Enviar comentário"
                    >
                      {isSubmittingComment ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pressione Enter para enviar, Shift+Enter para nova linha
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

