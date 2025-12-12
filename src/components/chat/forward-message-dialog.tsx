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
import { MessageSquare, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, Message, Room } from '@/lib/data';
import { useRouter } from 'next/navigation';

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message & { user?: User };
}

export function ForwardMessageDialog({ open, onOpenChange, message }: ForwardMessageDialogProps) {
  const [contacts, setContacts] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForwarding, setIsForwarding] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      fetchContacts();
      fetchRooms();
    }
  }, [open]);

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

  const handleForwardToUser = async (userId: string) => {
    setIsForwarding(true);
    try {
      // Create or get conversation
      const chatResponse = await fetch('/api/direct-conversations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId: userId }),
      });

      if (!chatResponse.ok) {
        throw new Error('Failed to create conversation');
      }

      const chatData = await chatResponse.json();
      const roomId = chatData.conversationId;

      // Forward message
      const forwardResponse = await fetch('/api/messages/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.id,
          toRoomId: roomId,
        }),
      });

      if (forwardResponse.ok) {
        toast({
          title: 'Mensagem encaminhada!',
          description: 'A mensagem foi encaminhada com sucesso.',
        });
        onOpenChange(false);
        router.push(`/chat/${roomId}`);
      } else {
        const data = await forwardResponse.json();
        throw new Error(data.error || 'Failed to forward message');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível encaminhar a mensagem',
        variant: 'destructive',
      });
    } finally {
      setIsForwarding(false);
    }
  };

  const handleForwardToRoom = async (roomId: string) => {
    setIsForwarding(true);
    try {
      const response = await fetch('/api/messages/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.id,
          toRoomId: roomId,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Mensagem encaminhada!',
          description: 'A mensagem foi encaminhada na sala com sucesso.',
        });
        onOpenChange(false);
        router.push(`/chat/${roomId}`);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to forward message');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível encaminhar a mensagem',
        variant: 'destructive',
      });
    } finally {
      setIsForwarding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Encaminhar Mensagem</DialogTitle>
          <DialogDescription>
            Escolha para onde deseja encaminhar esta mensagem
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4">
            {/* Contacts */}
            {contacts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Encaminhar para contato
                </h3>
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <Button
                      key={contact.id}
                      variant="ghost"
                      className="w-full justify-start h-auto p-3"
                      onClick={() => handleForwardToUser(contact.id)}
                      disabled={isForwarding}
                    >
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
                  Encaminhar em sala
                </h3>
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <Button
                      key={room.id}
                      variant="ghost"
                      className="w-full justify-start h-auto p-3"
                      onClick={() => handleForwardToRoom(room.id)}
                      disabled={isForwarding}
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
      </DialogContent>
    </Dialog>
  );
}

