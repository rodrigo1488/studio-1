'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RoomCodeDisplay } from '@/components/room-code-display';

export default function CreateRoomPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<{ code: string; name: string } | null>(null);

  const handleCreateRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('room-name') as string;

    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Erro ao criar sala',
          description: data.error || 'Ocorreu um erro ao criar a sala',
          variant: 'destructive',
        });
        return;
      }

      // Show modal with room code
      setCreatedRoom({
        code: data.room.code,
        name: name.trim(),
      });
    } catch (error) {
      toast({
        title: 'Erro ao criar sala',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="container mx-auto max-w-lg">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Criar Nova Sala</CardTitle>
            <CardDescription>
              Dê um nome para sua sala privada. Após criar, você receberá um código
              para convidar sua família.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateRoom}>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="room-name">Nome da Sala</Label>
                <Input
                  id="room-name"
                  name="room-name"
                  placeholder="Ex: Família, Fim de Semana"
                  required
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {isLoading ? 'Criando...' : 'Criar Sala'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Modal with room code */}
      <Dialog open={!!createdRoom} onOpenChange={(open) => {
        if (!open) {
          setCreatedRoom(null);
          router.push('/dashboard');
          router.refresh();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sala criada com sucesso!</DialogTitle>
            <DialogDescription>
              Compartilhe este código para convidar pessoas para a sala.
            </DialogDescription>
          </DialogHeader>
          {createdRoom && (
            <RoomCodeDisplay
              code={createdRoom.code}
              roomName={createdRoom.name}
              showInModal={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
