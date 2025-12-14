'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PostCard } from '@/components/feed/post-card';
import { PostGridItem } from '@/components/feed/post-grid-item';
import { CreatePost } from '@/components/feed/create-post';
import { FeedViewToggle } from '@/components/feed/feed-view-toggle';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import type { Post } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { PostCardSkeleton, PostGridSkeleton } from '@/components/ui/post-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { FeedFilters } from '@/components/feed/feed-filters';
import { StoriesCarousel } from '@/components/stories/stories-carousel';
import { CreateStory } from '@/components/stories/create-story';

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'likes' | 'comments'>('recent');
  const [filterByUser, setFilterByUser] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchPosts(true);
    }
  }, [currentUserId, searchQuery, sortBy, filterByUser]);

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
    <div className="space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-6 px-1.5 sm:px-2 md:px-4 lg:px-6 pb-20 sm:pb-6">
      {/* Header - Mobile First */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 md:gap-4 pt-1.5 sm:pt-2 md:pt-4">
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 shrink-0" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              <span className="sr-only">Voltar ao dashboard</span>
            </Link>
          </Button>
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold truncate">Feed</h1>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 flex-shrink-0">
          <FeedViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          <Button 
            onClick={() => setShowCreateStory(true)}
            variant="outline"
            size="sm"
            className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 px-2 sm:px-3"
          >
            <ImageIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1" />
            <span className="hidden sm:inline">Story</span>
            <span className="sm:hidden">S</span>
          </Button>
          <Button 
            onClick={() => setShowCreatePost(true)}
            size="sm"
            className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 px-2 sm:px-3"
          >
            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1" />
            <span className="hidden sm:inline">Nova publicação</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Stories Carousel */}
      {currentUserId && (
        <div className="bg-card rounded-lg border p-2 sm:p-3 md:p-4 overflow-hidden">
          <StoriesCarousel currentUserId={currentUserId} />
        </div>
      )}

      {/* Filters */}
      <FeedFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterByUser={filterByUser}
        onFilterByUserChange={setFilterByUser}
      />

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

      {/* FAB para mobile */}
      <Button
        onClick={() => setShowCreatePost(true)}
        className="fixed bottom-20 sm:bottom-24 right-3 sm:right-4 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg z-50 touch-manipulation"
        size="icon"
        aria-label="Criar nova publicação"
      >
        <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>

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
    </div>
  );
}

