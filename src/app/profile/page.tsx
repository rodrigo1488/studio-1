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
import { getCurrentUser } from '@/lib/data';
import { ArrowLeft, LogOut, Camera } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/data';

export default function ProfilePage() {
  const [user, setUser] = useState<User | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleLogout = () => {
    router.push('/');
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    const initials = names.map((n) => n[0]).join('');
    return initials.slice(0, 2).toUpperCase();
  };

  if (!user) {
    return null; // Or a loading skeleton
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
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <Button size="icon" className="absolute bottom-0 right-0 rounded-full h-7 w-7">
                <Camera className="h-4 w-4" />
                <span className="sr-only">Change photo</span>
              </Button>
            </div>
            <div>
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" defaultValue={user.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={user.email} disabled />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button>Salvar Alterações</Button>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
