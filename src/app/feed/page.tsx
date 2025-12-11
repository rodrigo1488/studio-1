'use client';

import { useState, useEffect } from 'react';
import { PostCard } from '@/components/feed/post-card';
import { PostGridItem } from '@/components/feed/post-grid-item';
import { CreatePost } from '@/components/feed/create-post';
import { FeedViewToggle } from '@/components/feed/feed-view-toggle';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Post } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchPosts();
  }, []);

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
    try {
      setIsLoading(true);
      const response = await fetch('/api/feed/list');
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
          title: 'Erro ao carregar feed',
          description: 'Não foi possível carregar as publicações.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: 'Erro ao carregar feed',
        description: 'Ocorreu um erro ao carregar as publicações.',
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
    // TODO: Implement edit functionality
    toast({
      title: 'Em breve',
      description: 'A edição de posts estará disponível em breve.',
    });
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
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="sr-only">Voltar ao dashboard</span>
            </Link>
          </Button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Feed</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <FeedViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          <Button 
            onClick={() => setShowCreatePost(true)}
            size="sm"
            className="text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Nova publicação</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 sm:h-64">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-muted-foreground mb-4">Nenhuma publicação ainda</p>
          <Button onClick={() => setShowCreatePost(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
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

      {/* FAB para mobile */}
      <Button
        onClick={() => setShowCreatePost(true)}
        className="fixed bottom-20 right-4 sm:hidden h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <CreatePost
        open={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={fetchPosts}
      />
    </div>
  );
}

