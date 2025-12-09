'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageSquareHeart } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          // User is already logged in, redirect to dashboard
          router.push('/dashboard');
          router.refresh();
        } else {
          // User is not authenticated, show home page
          setIsCheckingAuth(false);
        }
      } catch (error) {
        // Error checking auth, show home page anyway
        setIsCheckingAuth(false);
      }
    }
    checkAuth();
  }, [router]);

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center px-4 md:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        <div className="mx-auto max-w-md space-y-6">
          <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-full bg-primary/10">
            <MessageSquareHeart className="h-32 w-32 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              FamilyChat: Secure Connect
            </h1>
            <p className="text-muted-foreground md:text-xl">
              Converse com seus filhos de forma segura. Sem exposição. Sem ruído.
              Só vocês.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 min-[400px]:flex-row">
            <Button asChild className="w-full" size="lg">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild className="w-full" variant="secondary" size="lg">
              <Link href="/register">Criar Conta</Link>
            </Button>
          </div>
        </div>
      </main>
       <footer className="flex h-16 items-center justify-center px-4 md:px-6">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} FamilyChat. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
