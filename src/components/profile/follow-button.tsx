'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FollowButtonProps {
  userId: string;
  currentUserId: string;
}

export function FollowButton({ userId, currentUserId }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userId !== currentUserId) {
      checkFollowStatus();
    } else {
      setIsLoading(false);
    }
  }, [userId, currentUserId]);

  const checkFollowStatus = async () => {
    try {
      const response = await fetch(`/api/follow/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.following || false);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (isToggling) return;

    setIsToggling(true);
    const previousState = isFollowing;

    // Optimistic update
    setIsFollowing(!isFollowing);

    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/follow/${userId}`, { method });

      if (!response.ok) {
        throw new Error('Failed to toggle follow');
      }

      toast({
        title: isFollowing ? 'Deixou de seguir' : 'Seguindo',
        description: isFollowing
          ? 'Você deixou de seguir este usuário'
          : 'Você está seguindo este usuário',
      });
    } catch (error) {
      // Revert on error
      setIsFollowing(previousState);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status de seguimento',
        variant: 'destructive',
      });
    } finally {
      setIsToggling(false);
    }
  };

  if (userId === currentUserId || isLoading) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      size="sm"
      onClick={handleToggleFollow}
      disabled={isToggling}
    >
      {isToggling ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="h-4 w-4 mr-2" />
          Seguindo
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Seguir
        </>
      )}
    </Button>
  );
}

