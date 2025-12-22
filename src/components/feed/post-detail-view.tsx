'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, MessageCircle, Send, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
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

interface PostDetailViewProps {
    post: Post;
    currentUserId: string;
    onLike: (postId: string) => Promise<void>;
    onDelete?: (postId: string) => void;
    onEdit?: (postId: string) => void;
}

export function PostDetailView({ post, currentUserId, onLike, onDelete, onEdit }: PostDetailViewProps) {
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
    const hasMultipleImages = post.media && post.media.length > 1;

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
        <div className="flex flex-col md:flex-row h-full min-h-[calc(100vh-64px)] bg-background">
            {/* Image Section */}
            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[40vh] md:min-h-0">
                {post.media.length > 0 && (
                    <>
                        <Image
                            src={post.media[currentImageIndex].mediaUrl}
                            alt={post.description || 'Post image'}
                            width={1200}
                            height={1200}
                            className="object-contain max-h-[85vh] w-full"
                        />
                        {hasMultipleImages && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white"
                                    onClick={handlePreviousImage}
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white"
                                    onClick={handleNextImage}
                                >
                                    <ChevronRight className="h-6 w-6" />
                                </Button>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                                    {post.media.map((_, index) => (
                                        <div
                                            key={index}
                                            className={cn(
                                                'h-2 rounded-full transition-all',
                                                index === currentImageIndex
                                                    ? 'w-8 bg-white'
                                                    : 'w-2 bg-white/50'
                                            )}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Content Section */}
            <div className="flex flex-col w-full md:w-[400px] border-l bg-background">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
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

                {/* Description */}
                {post.description && (
                    <div className="p-4 border-b">
                        <div className="text-sm leading-relaxed">
                            <span className="font-semibold mr-1">{post.user?.name || 'Usuário'}</span>
                            <span>{post.description}</span>
                        </div>
                    </div>
                )}

                {/* Comments Section */}
                <div className="flex flex-col flex-1 min-h-[300px]">
                    <div className="px-4 py-2 border-b bg-muted/10">
                        <h3 className="text-sm font-semibold">
                            {commentsCount > 0 ? `${commentsCount} comentário${commentsCount !== 1 ? 's' : ''}` : 'Comentários'}
                        </h3>
                    </div>
                    <ScrollArea className="flex-1 h-0">
                        <div className="p-3 sm:p-4 space-y-4">
                            {isLoadingComments ? (
                                <div className="text-center text-muted-foreground py-8 text-sm">
                                    Carregando comentários...
                                </div>
                            ) : comments.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8 text-sm">
                                    Nenhum comentário ainda. Seja o primeiro a comentar!
                                </div>
                            ) : (
                                comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage src={comment.user?.avatarUrl} />
                                            <AvatarFallback className="text-xs">
                                                {getInitials(comment.user?.name || 'U')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="bg-muted/30 rounded-lg p-3">
                                                <div className="flex justify-between items-start gap-2 mb-1">
                                                    <span className="font-semibold text-sm">{comment.user?.name || 'Usuário'}</span>
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                        {formatDistanceToNow(comment.createdAt, { addSuffix: true, locale: ptBR })}
                                                    </span>
                                                </div>
                                                <p className="text-sm break-words leading-relaxed">{comment.text}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Actions */}
                <div className="p-4 border-t bg-background">
                    <div className="flex items-center gap-4 mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn('h-10 w-10', isLiked && 'text-red-500 hover:text-red-600')}
                            onClick={handleLike}
                            disabled={isLiking}
                        >
                            <Heart className={cn('h-6 w-6', isLiked && 'fill-current')} />
                        </Button>
                        <div className="flex items-center gap-1.5">
                            <MessageCircle className="h-6 w-6 text-muted-foreground" />
                            <span className="font-medium">{commentsCount}</span>
                        </div>
                        {likesCount > 0 && (
                            <div className="ml-auto font-semibold text-sm">
                                {likesCount} curtida{likesCount !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>

                    {/* Comment Input */}
                    <div className="relative flex items-center gap-2">
                        <Textarea
                            placeholder="Adicione um comentário..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmitComment();
                                }
                            }}
                            className="min-h-[44px] max-h-[120px] resize-none pr-12 text-sm py-3"
                            rows={1}
                        />
                        <Button
                            size="icon"
                            className="absolute right-1 bottom-1 h-9 w-9"
                            onClick={handleSubmitComment}
                            disabled={!commentText.trim() || isSubmittingComment}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
