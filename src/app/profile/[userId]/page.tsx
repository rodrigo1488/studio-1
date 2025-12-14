'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Image as ImageIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import type { User, Post } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/utils';
import { PostGridItem } from '@/components/feed/post-grid-item';
import { ProfileStats } from '@/components/profile/profile-stats';
import { FollowButton } from '@/components/profile/follow-button';

export default function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchProfileUser();
      fetchCurrentUser();
    }
  }, [userId]);

  useEffect(() => {
    if (profileUser?.id) {
      fetchUserPosts(profileUser.id);
    }
  }, [profileUser]);

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

  const fetchProfileUser = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProfileUser(data.user);
      } else if (response.status === 404) {
        toast({
          title: 'Usuário não encontrado',
          description: 'O perfil que você está procurando não existe.',
          variant: 'destructive',
        });
        router.push('/dashboard');
      } else {
        throw new Error('Erro ao carregar perfil');
      }
    } catch (error) {
      console.error('Error fetching profile user:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o perfil.',
        variant: 'destructive',
      });
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserPosts = async (userId: string) => {
    try {
      setIsLoadingPosts(true);
      const response = await fetch(`/api/feed/user/${userId}?limit=12`);
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
      }
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return null;
  }

  const isOwnProfile = currentUserId === profileUser.id;

  return (
    <div className="container mx-auto max-w-2xl">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>
                Visualize o perfil de {profileUser.name}
              </CardDescription>
            </div>
            {!isOwnProfile && currentUserId && (
              <FollowButton userId={profileUser.id} currentUserId={currentUserId} />
            )}
            {isOwnProfile && (
              <Button asChild variant="outline" size="sm">
                <Link href="/profile">
                  Editar Perfil
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {profileUser && <ProfileStats userId={profileUser.id} />}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileUser.avatarUrl} alt={profileUser.name} />
              <AvatarFallback>{getInitials(profileUser.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{profileUser.name}</h2>
              {profileUser.nickname && (
                <p className="text-sm text-muted-foreground">@{profileUser.nickname}</p>
              )}
              <p className="text-sm text-muted-foreground">{profileUser.email}</p>
              {profileUser.bio && (
                <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{profileUser.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção de Posts */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Publicações</CardTitle>
              <CardDescription>
                {posts.length > 0 
                  ? `${posts.length} publicação${posts.length !== 1 ? 'ões' : ''}`
                  : 'Nenhuma publicação ainda'}
              </CardDescription>
            </div>
            {posts.length > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/feed?userId=${profileUser.id}`}>
                  Ver Todas
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPosts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                {isOwnProfile 
                  ? 'Você ainda não tem publicações'
                  : `${profileUser.name} ainda não tem publicações`}
              </p>
              {isOwnProfile && (
                <Button asChild className="mt-4">
                  <Link href="/feed">
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Criar primeira publicação
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {posts.slice(0, 9).map((post) => {
                const firstImage = post.media[0];
                if (!firstImage) return null;

                return (
                  <Link
                    key={post.id}
                    href={`/feed?postId=${post.id}`}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-colors group"
                  >
                    <img
                      src={firstImage.mediaUrl}
                      alt={post.description || 'Post'}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay com stats */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-1 text-white text-xs">
                        <ImageIcon className="h-3 w-3" />
                        <span>{post.media.length}</span>
                      </div>
                    </div>
                    {/* Indicador de múltiplas imagens */}
                    {post.media.length > 1 && (
                      <div className="absolute top-2 right-2">
                        <svg
                          className="w-4 h-4 text-white drop-shadow-lg"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

