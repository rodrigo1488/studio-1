import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex flex-col items-start justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-headline truncate">
            Suas Conversas
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Conecte-se com sua família em espaços privados e seguros.
          </p>
        </div>
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <Button asChild className="w-full sm:w-auto text-sm">
            <Link href="/dashboard/create-room">
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Sala
            </Link>
          </Button>
          <Button asChild variant="secondary" className="w-full sm:w-auto text-sm">
            <Link href="/dashboard/join-room">
              <ArrowRight className="mr-2 h-4 w-4" />
              Entrar com Código
            </Link>
          </Button>
        </div>
      </div>
      <div className="mt-4 sm:mt-6">
        <p className="text-sm text-muted-foreground">
          Use o menu lateral para navegar entre Grupos, Conversas e Contatos.
        </p>
      </div>
    </div>
  );
}
