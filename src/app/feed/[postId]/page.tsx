'use client';

import { useEffect, useState, use } from 'react';
import { PostDetailView } from '@/components/feed/post-detail-view';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { Post } from '@/lib/data';
import { useRouter } from 'next/navigation';

export default function PostPage({ params }: { params: Promise<{ postId: string }> }) {
    const router = useRouter();
    const [post, setPost] = useState<Post | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiking, setIsLiking] = useState(false);
    const { toast } = useToast();

    const unwrappedParams = use(params);
    const postId = unwrappedParams.postId;

    useEffect(() => {
        fetchData();
    }, [postId]);

    const fetchData = async () => {
        try {
            // Fetch current user
            const authResponse = await fetch('/api/auth/me');
            if (authResponse.ok) {
                const authData = await authResponse.json();
                setCurrentUserId(authData.user?.id || null);
            }

            // Fetch post
            const response = await fetch(`/api/feed/${postId}`);
            if (response.ok) {
                const data = await response.json();
                // Convert dates
                setPost({
                    ...data.post,
                    createdAt: new Date(data.post.createdAt),
                    updatedAt: new Date(data.post.updatedAt),
                    media: data.post.media.map((m: any) => ({
                        ...m,
                        createdAt: new Date(m.createdAt),
                    })),
                });
            } else {
                throw new Error('Post not found');
            }
        } catch (error) {
            console.error('Error fetching post:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível carregar o post.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLike = async (postId: string) => {
        if (isLiking) return;
        setIsLiking(true);
        try {
            const response = await fetch(`/api/feed/${postId}/like`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Failed to toggle like');
        } catch (error) {
            throw error;
        } finally {
            setIsLiking(false);
        }
    };

    const handleDelete = async (postId: string) => {
        if (!confirm('Tem certeza que deseja excluir este post?')) return;

        try {
            const response = await fetch(`/api/feed/${postId}/delete`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast({
                    title: 'Post excluído',
                    description: 'O post foi excluído com sucesso.',
                });
                router.push('/feed');
            } else {
                throw new Error('Failed to delete post');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível excluir o post.',
                variant: 'destructive',
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!post || !currentUserId) {
        return (
            <div className="flex flex-col h-screen items-center justify-center gap-4">
                <h1 className="text-2xl font-bold">Post não encontrado</h1>
                <Button asChild>
                    <Link href="/feed">Voltar para o Feed</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="p-4 border-b">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/feed" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para o Feed
                    </Link>
                </Button>
            </div>
            <div className="flex-1">
                <PostDetailView
                    post={post}
                    currentUserId={currentUserId}
                    onLike={handleLike}
                    onDelete={handleDelete}
                    // Editing is complex to lift up state quickly, skipping for detail view initially or implement simple prompt
                    onEdit={(id) => console.log('Edit', id)}
                />
            </div>
        </div>
    );
}
