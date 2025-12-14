'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PostCard } from '@/components/feed/post-card';
import { PostGridItem } from '@/components/feed/post-grid-item';
import { CreatePost } from '@/components/feed/create-post';
import { Button } from '@/components/ui/button';
import { Loader2, Image as ImageIcon, Plus } from 'lucide-react';
import Link from 'next/link';
import { useFeed } from '@/components/feed/feed-context';
import type { Post } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { PostCardSkeleton, PostGridSkeleton } from '@/components/ui/post-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
// import { FeedFilters } from '@/components/feed/feed-filters';
import { StoriesCarousel } from '@/components/stories/stories-carousel';
import { CreateStory } from '@/components/stories/create-story';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function FeedPage() {
  const { viewMode } = useFeed();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatarUrl?: string } | null>(null);
  const [isLiking, setIsLiking] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'likes' | 'comments'>('recent');
  const [filterByUser, setFilterByUser] = useState<string | undefined>(undefined);
  const [filterByDate, setFilterByDate] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');
  const [filterByMediaType, setFilterByMediaType] = useState<'image' | 'video' | 'all'>('all');
  const [filterByLiked, setFilterByLiked] = useState(false);
  const [filterBySaved, setFilterBySaved] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchPosts(true);
    }
  }, [currentUserId, searchQuery, sortBy, filterByUser, filterByDate, filterByMediaType, filterByLiked, filterBySaved]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.user?.id || null);
        setCurrentUser(data.user ? {
          id: data.user.id,
          name: data.user.name,
          avatarUrl: data.user.avatarUrl,
        } : null);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchPosts = async (reset = false) => {
    try {
      if (reset) {
        setIsLoading(true);
        setOffset(0);
        setHasMore(true);
      } else {
        setIsLoadingMore(true);
      }

      const currentOffset = reset ? 0 : offset;
      const params = new URLSearchParams({
        limit: '20',
        offset: currentOffset.toString(),
      });
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }
      if (sortBy !== 'recent') {
        params.append('sortBy', sortBy);
      }
      if (filterByUser) {
        params.append('userId', filterByUser);
      }
      if (filterByDate !== 'all') {
        params.append('dateFilter', filterByDate);
      }
      if (filterByMediaType !== 'all') {
        params.append('mediaType', filterByMediaType);
      }
      if (filterByLiked) {
        params.append('liked', 'true');
      }
      if (filterBySaved) {
        params.append('saved', 'true');
      }
      const response = await fetch(`/api/feed/list?${params.toString()}`);
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

        if (reset) {
          setPosts(postsWithDates);
        } else {
          setPosts((prev) => [...prev, ...postsWithDates]);
        }

        setHasMore(postsWithDates.length === 20);
        setOffset((prev) => prev + postsWithDates.length);
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
      setIsLoadingMore(false);
    }
  };

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          fetchPosts(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore, isLoadingMore, offset]);

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
        const updatedPost = {
          ...data.post,
          createdAt: new Date(data.post.createdAt),
          updatedAt: new Date(data.post.updatedAt),
          media: data.post.media.map((m: any) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          })),
        };
        setPosts((prev) =>
          prev.map((post) => (post.id === editingPost.id ? updatedPost : post))
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
    <div className="w-full max-w-6xl mx-auto space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-6">
      {/* Stories Carousel */}
      {currentUserId && (
        <div className="p-2 sm:p-3 md:p-4 overflow-hidden">
          <StoriesCarousel 
            currentUserId={currentUserId} 
            onCreateStory={() => setShowCreateStory(true)}
          />
        </div>
      )}

      {/* Filters */}
      {/* <FeedFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterByUser={filterByUser}
        onFilterByUserChange={setFilterByUser}
        filterByDate={filterByDate}
        onFilterByDateChange={setFilterByDate}
        filterByMediaType={filterByMediaType}
        onFilterByMediaTypeChange={setFilterByMediaType}
        filterByLiked={filterByLiked}
        onFilterByLikedChange={setFilterByLiked}
        filterBySaved={filterBySaved}
        onFilterBySavedChange={setFilterBySaved}
      /> */}

      {/* Posts */}
      {isLoading ? (
        viewMode === 'timeline' ? (
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {[1, 2, 3].map((i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 sm:gap-2 md:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <PostGridSkeleton key={i} />
            ))}
          </div>
        )
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />}
          title="Nenhuma publicação ainda"
          description="Compartilhe seus momentos com a família criando sua primeira publicação!"
          action={{
            label: 'Criar primeira publicação',
            onClick: () => setShowCreatePost(true),
          }}
        />
      ) : viewMode === 'timeline' ? (
        <>
          <div className="space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-6">
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
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-3 sm:py-4">
              {isLoadingMore && (
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground" />
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-0.5 sm:gap-1 md:gap-2 lg:gap-4">
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
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-3 sm:py-4">
              {isLoadingMore && (
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground" />
              )}
            </div>
          )}
        </>
      )}

      <CreatePost
        open={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={() => fetchPosts(true)}
      />

      <CreateStory
        open={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onStoryCreated={() => {
          // Stories will refresh automatically when component re-renders
          window.location.reload();
        }}
      />

      {/* Edit Post Dialog */}
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

