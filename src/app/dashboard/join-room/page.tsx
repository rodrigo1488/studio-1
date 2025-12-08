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
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function JoinRoomPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would:
    // 1. Validate the code.
    // 2. Add the user to the room's members list in Firestore.
    // 3. Redirect to the chat room.
    toast({
        title: 'Você entrou na sala!',
        description: 'Redirecionando para o chat...',
    })
    router.push('/chat/room-1'); // Redirect to a mock room
  };

  return (
    <div className="container mx-auto max-w-lg">
       <Button variant="ghost" asChild className="mb-4">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Entrar com Código</CardTitle>
          <CardDescription>
            Insira o código de convite que você recebeu para entrar em uma sala
            privada.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleJoinRoom}>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="room-code">Código da Sala</Label>
              <Input
                id="room-code"
                placeholder="Ex: A4B2C"
                required
                className="uppercase tracking-widest text-center text-lg h-12"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full sm:w-auto">
              <ArrowRight className="mr-2 h-4 w-4" />
              Entrar na Sala
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
