'use client';

import { useState, useEffect } from 'react';
import { PostCard } from '@/components/feed/post-card';
import { PostGridItem } from '@/components/feed/post-grid-item';
import { FeedViewToggle } from '@/components/feed/feed-view-toggle';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Edit, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import type { Post } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function ProfilePostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('grid');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchPosts();
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.user?.id || null);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchPosts = async () => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/feed/user/${currentUserId}`);
      if (response.ok) {
        const data = await response.json();
        // Convert ISO strings back to Date objects
        const postsWithDates = (data.posts || []).map((post: any) => ({
          ...post,
          createdAt: new Date(post.createdAt),
          updatedAt: new Date(post.updatedAt),
          media: (post.media || []).map((m: any) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          })),
        }));
        setPosts(postsWithDates);
      } else {
        toast({
          title: 'Erro ao carregar posts',
          description: 'Não foi possível carregar suas publicações.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: 'Erro ao carregar posts',
        description: 'Ocorreu um erro ao carregar suas publicações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (isLiking === postId) return;

    setIsLiking(postId);
    try {
      const response = await fetch(`/api/feed/${postId}/like`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle like');
      }

      const data = await response.json();
      
      // Update local state
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            const newLiked = data.liked;
            return {
              ...post,
              isLiked: newLiked,
              likesCount: newLiked ? (post.likesCount || 0) + 1 : Math.max(0, (post.likesCount || 0) - 1),
            };
          }
          return post;
        })
      );
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível curtir o post.',
        variant: 'destructive',
      });
    } finally {
      setIsLiking(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Tem certeza que deseja excluir este post?')) return;

    try {
      const response = await fetch(`/api/feed/${postId}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPosts((prev) => prev.filter((post) => post.id !== postId));
        toast({
          title: 'Post excluído',
          description: 'O post foi excluído com sucesso.',
        });
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

  const handleEdit = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setEditingPost(post);
      setEditDescription(post.description || '');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/feed/${editingPost.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editDescription }),
      });

      if (response.ok) {
        const data = await response.json();
        setPosts((prev) =>
          prev.map((post) => (post.id === editingPost.id ? data.post : post))
        );
        setEditingPost(null);
        toast({
          title: 'Post atualizado',
          description: 'A descrição do post foi atualizada com sucesso.',
        });
      } else {
        throw new Error('Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o post.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUserId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 px-2 sm:px-4 md:px-6 pb-20 sm:pb-6">
      {/* Header - Mobile First */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pt-2 sm:pt-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" asChild>
            <Link href="/profile">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="sr-only">Voltar ao perfil</span>
            </Link>
          </Button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Minhas Publicações</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <FeedViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          <Button onClick={() => router.push('/feed')} size="sm" className="text-xs sm:text-sm">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Nova Publicação</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Você ainda não tem publicações</p>
          <Button onClick={() => router.push('/feed')}>
            Criar primeira publicação
          </Button>
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onLike={handleLike}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 sm:gap-2 md:gap-4">
          {posts.map((post) => (
            <PostGridItem
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onLike={handleLike}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent className="max-w-lg w-full mx-4">
          <DialogHeader>
            <DialogTitle>Editar Post</DialogTitle>
            <DialogDescription>Atualize a descrição do seu post</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Escreva uma legenda..."
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="min-h-[100px] sm:min-h-[120px] resize-none text-sm sm:text-base"
              rows={4}
            />
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setEditingPost(null)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveEdit} 
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

