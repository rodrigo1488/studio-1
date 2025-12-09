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
import { useState } from 'react';

export default function JoinRoomPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const code = formData.get('room-code') as string;

    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Erro ao entrar na sala',
          description: data.error || 'Código inválido',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Você entrou na sala!',
        description: 'Redirecionando para o chat...',
      });

      router.push(`/chat/${data.room.id}`);
      router.refresh();
    } catch (error) {
      toast({
        title: 'Erro ao entrar na sala',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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
                name="room-code"
                placeholder="Ex: A4B2C"
                required
                disabled={isLoading}
                className="uppercase tracking-widest text-center text-lg h-12"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
              <ArrowRight className="mr-2 h-4 w-4" />
              {isLoading ? 'Entrando...' : 'Entrar na Sala'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
