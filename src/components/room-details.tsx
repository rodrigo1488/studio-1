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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Camera, MessageSquare, Users, X } from 'lucide-react';
import { getInitials, cn } from '@/lib/utils';
import type { Room, User } from '@/lib/data';
import { useRouter } from 'next/navigation';

interface RoomDetailsProps {
  room: Room;
  currentUser: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RoomMember extends User {
  isOwner?: boolean;
}

export function RoomDetails({ room, currentUser, open, onOpenChange }: RoomDetailsProps) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (open && room) {
      fetchMembers();
    }
  }, [open, room]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/rooms/${room.id}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 5MB',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Por favor, selecione uma imagem',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', room.id);

      const response = await fetch('/api/rooms/update-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao atualizar imagem');
      }

      toast({
        title: 'Imagem atualizada',
        description: 'A imagem da sala foi atualizada com sucesso',
      });

      // Recarregar a página para mostrar a nova imagem
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar imagem',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleStartDM = async (otherUserId: string) => {
    if (otherUserId === currentUser.id) {
      toast({
        title: 'Erro',
        description: 'Você não pode iniciar uma conversa consigo mesmo',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/direct-conversations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otherUserId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao criar conversa');
      }

      const data = await response.json();
      
      // Fechar o modal
      onOpenChange(false);
      
      // Navegar para a conversa
      router.push(`/chat/${data.conversationId}`);
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar conversa',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    }
  };

  const isDirectConversation = room.code?.startsWith('DM-');
  const canEditImage = !isDirectConversation && room.ownerId === currentUser.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Detalhes da Sala
          </DialogTitle>
          <DialogDescription>
            {isDirectConversation ? 'Informações da conversa direta' : 'Informações e participantes da sala'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Imagem da Sala */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={room.avatarUrl} />
                <AvatarFallback className="text-2xl">
                  {getInitials(room.name)}
                </AvatarFallback>
              </Avatar>
              {canEditImage && (
                <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">{room.name}</h3>
              {room.code && !isDirectConversation && (
                <p className="text-sm text-muted-foreground mt-1">
                  Código: {room.code}
                </p>
              )}
            </div>
          </div>

          {/* Participantes */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participantes ({members.length})
            </h4>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse bg-muted rounded-lg" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum participante encontrado</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={member.avatarUrl} />
                        <AvatarFallback>
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {member.name}
                          {member.isOwner && (
                            <span className="ml-2 text-xs text-muted-foreground">(Dono)</span>
                          )}
                        </p>
                        {member.nickname && (
                          <p className="text-xs text-muted-foreground truncate">
                            @{member.nickname}
                          </p>
                        )}
                      </div>
                    </div>
                    {member.id !== currentUser.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartDM(member.id)}
                        className="shrink-0"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Mensagem
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

