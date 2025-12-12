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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, LogOut, Camera, X, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import type { User, Post } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/utils';
import { PostGridItem } from '@/components/feed/post-grid-item';
import { Loader2 } from 'lucide-react';
import { ProfileStats } from '@/components/profile/profile-stats';

export default function ProfilePage() {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setName(data.user.name);
          setNickname(data.user.nickname || '');
          
          // Buscar posts do usuário
          if (data.user?.id) {
            fetchUserPosts(data.user.id);
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, [router]);

  const fetchUserPosts = async (userId: string) => {
    try {
      setIsLoadingPosts(true);
      const response = await fetch(`/api/feed/user/${userId}?limit=6`);
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Por favor, selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Arquivo muito grande',
        description: `O arquivo deve ter no máximo ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        variant: 'destructive',
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload avatar
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/profile/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao fazer upload da imagem');
      }

      const uploadData = await uploadResponse.json();
      if (!uploadData || !uploadData.url) {
        throw new Error('Resposta inválida do servidor');
      }

      // Update profile with new avatar URL
      const updateResponse = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim() || user?.name,
          nickname: nickname.trim() || null,
          avatarUrl: uploadData.url,
        }),
      });

      const updateData = await updateResponse.json();

      if (!updateResponse.ok) {
        throw new Error(updateData.error || 'Erro ao atualizar perfil');
      }

      setUser(updateData.user);
      setAvatarPreview(null);
      toast({
        title: 'Foto atualizada!',
        description: 'Sua foto de perfil foi atualizada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar foto',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);

    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim() || user?.name,
          nickname: nickname.trim() || null,
          avatarUrl: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao remover foto');
      }

      setUser(data.user);
      setAvatarPreview(null);
      toast({
        title: 'Foto removida!',
        description: 'Sua foto de perfil foi removida.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover foto',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Nome inválido',
        description: 'O nome não pode estar vazio',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          nickname: nickname.trim() || null,
          avatarUrl: user?.avatarUrl || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Erro ao salvar',
          description: data.error || 'Tente novamente',
          variant: 'destructive',
        });
        return;
      }

      setUser(data.user);
      toast({
        title: 'Perfil atualizado!',
        description: 'Suas alterações foram salvas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl">
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

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
          <CardTitle>Seu Perfil</CardTitle>
          <CardDescription>
            Gerencie suas informações e configurações de conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {user && <ProfileStats userId={user.id} />}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-20 w-20">
                <AvatarImage 
                  src={avatarPreview || user.avatarUrl} 
                  alt={user.name} 
                />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              {isUploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={isUploadingAvatar}
              />
              <div className="absolute bottom-0 right-0 flex gap-1">
                <Button
                  size="icon"
                  className="rounded-full h-8 w-8 bg-primary hover:bg-primary/90"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  <Camera className="h-4 w-4" />
                  <span className="sr-only">Alterar foto</span>
                </Button>
                {user.avatarUrl && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="rounded-full h-8 w-8"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remover foto</span>
                  </Button>
                )}
              </div>
            </div>
            <div>
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="seu_nickname"
                disabled={isSaving}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Seu nickname único para que outros usuários possam te encontrar. Apenas letras, números e underscore.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user.email} disabled />
            </div>
          </div>
          <div className="space-y-3">
            <Button asChild variant="outline" className="w-full">
              <Link href="/profile/posts">
                <ImageIcon className="mr-2 h-4 w-4" />
                Gerenciar Minhas Publicações
              </Link>
            </Button>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button variant="destructive" onClick={handleLogout} disabled={isSaving}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção de Posts */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Minhas Publicações</CardTitle>
              <CardDescription>
                {posts.length > 0 
                  ? `${posts.length} publicação${posts.length !== 1 ? 'ões' : ''}`
                  : 'Nenhuma publicação ainda'}
              </CardDescription>
            </div>
            {posts.length > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link href="/profile/posts">
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
              <p className="text-sm text-muted-foreground mb-4">
                Você ainda não tem publicações
              </p>
              <Button asChild>
                <Link href="/feed">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Criar primeira publicação
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {posts.slice(0, 6).map((post) => {
                const firstImage = post.media[0];
                if (!firstImage) return null;

                return (
                  <Link
                    key={post.id}
                    href="/profile/posts"
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
