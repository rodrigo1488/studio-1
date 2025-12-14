'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarWithPresence } from '@/components/ui/avatar-with-presence';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Users, Copy, Check, Share2, ExternalLink } from 'lucide-react';
import type { User } from '@/lib/data';
import { getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface SharePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

export function SharePostDialog({ open, onOpenChange, postId }: SharePostDialogProps) {
  const [contacts, setContacts] = useState<User[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [postData, setPostData] = useState<any>(null);
  const { toast } = useToast();
  const router = useRouter();
  
  const isWebShareSupported = typeof navigator !== 'undefined' && 'share' in navigator;

  useEffect(() => {
    if (open) {
      fetchContacts();
      fetchRooms();
      fetchPostData();
    }
  }, [open, postId]);
  
  const fetchPostData = async () => {
    try {
      const response = await fetch(`/api/feed/post/${postId}`);
      if (response.ok) {
        const data = await response.json();
        setPostData(data.post);
      }
    } catch (error) {
      console.error('Error fetching post data:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts/list');
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms/list');
      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms || []);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleShareToUser = async (userId: string) => {
    setIsSharing(true);
    try {
      const response = await fetch(`/api/feed/${postId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharedToUserId: userId }),
      });

      if (response.ok) {
        toast({
          title: 'Post compartilhado!',
          description: 'O post foi compartilhado com sucesso.',
        });
        onOpenChange(false);
        // Navigate to chat
        const chatResponse = await fetch('/api/direct-conversations/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otherUserId: userId }),
        });
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          router.push(`/chat/${chatData.conversationId}`);
        }
      } else {
        const data = await response.json();
        toast({
          title: 'Erro',
          description: data.error || 'Não foi possível compartilhar o post',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao compartilhar o post',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareToRoom = async (roomId: string) => {
    setIsSharing(true);
    try {
      const response = await fetch(`/api/feed/${postId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharedToRoomId: roomId }),
      });

      if (response.ok) {
        toast({
          title: 'Post compartilhado!',
          description: 'O post foi compartilhado na sala com sucesso.',
        });
        onOpenChange(false);
        router.push(`/chat/${roomId}`);
      } else {
        const data = await response.json();
        toast({
          title: 'Erro',
          description: data.error || 'Não foi possível compartilhar o post',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao compartilhar o post',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/feed?post=${postId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: 'Link copiado!',
        description: 'O link do post foi copiado para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o link',
        variant: 'destructive',
      });
    }
  };

  const handleWebShare = async () => {
    if (!isWebShareSupported || !postData) return;

    const link = `${window.location.origin}/feed?post=${postId}`;
    const text = postData.description || 'Confira este post!';
    const title = postData.user?.name 
      ? `Post de ${postData.user.name}`
      : 'Post do FamilyChat';

    try {
      await navigator.share({
        title,
        text,
        url: link,
      });
      toast({
        title: 'Compartilhado!',
        description: 'O post foi compartilhado com sucesso.',
      });
      onOpenChange(false);
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        toast({
          title: 'Erro',
          description: 'Não foi possível compartilhar o post',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Compartilhar Post</DialogTitle>
          <DialogDescription>
            Escolha onde deseja compartilhar este post
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Web Share API */}
          {isWebShareSupported && (
            <div className="border rounded-lg p-3">
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={handleWebShare}
                disabled={!postData}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar externamente
              </Button>
            </div>
          )}

          {/* Copy Link */}
          <div className="border rounded-lg p-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Link copiado!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar link
                </>
              )}
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {/* Contacts */}
              {contacts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Compartilhar com contato
                  </h3>
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <Button
                        key={contact.id}
                        variant="ghost"
                        className="w-full justify-start h-auto p-3"
                        onClick={() => handleShareToUser(contact.id)}
                        disabled={isSharing}
                      >
                        <AvatarWithPresence
                          user={contact}
                          size="sm"
                          className="mr-3"
                        />
                        <div className="flex-1 text-left">
                          <p className="font-medium">{contact.name}</p>
                          {contact.nickname && (
                            <p className="text-xs text-muted-foreground">
                              @{contact.nickname}
                            </p>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rooms */}
              {rooms.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Compartilhar em sala
                  </h3>
                  <div className="space-y-2">
                    {rooms.map((room) => (
                      <Button
                        key={room.id}
                        variant="ghost"
                        className="w-full justify-start h-auto p-3"
                        onClick={() => handleShareToRoom(room.id)}
                        disabled={isSharing}
                      >
                        <div className="flex-1 text-left">
                          <p className="font-medium">{room.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {room.memberCount || room.members?.length || 0} membros
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

