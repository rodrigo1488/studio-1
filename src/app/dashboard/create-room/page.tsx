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

export default function CreateRoomPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would:
    // 1. Call a server action/API to create the room in Firestore.
    // 2. Get the unique room code back.
    // 3. Display the code to the user in a toast or modal.
    const mockRoomCode = 'A4B2C'
    toast({
        title: 'Sala criada com sucesso!',
        description: `Seu código de convite é: ${mockRoomCode}`,
    })
    router.push('/dashboard');
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
                placeholder="Ex: Família, Fim de Semana"
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Sala
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
