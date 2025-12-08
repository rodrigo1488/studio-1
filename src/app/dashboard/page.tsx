import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import RoomList from './components/room-list';

export default function DashboardPage() {
  return (
    <div className="container mx-auto max-w-4xl">
      <div className="flex flex-col items-start justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Suas Salas de Chat
          </h1>
          <p className="text-muted-foreground">
            Conecte-se com sua família em espaços privados e seguros.
          </p>
        </div>
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/create-room">
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Sala
            </Link>
          </Button>
          <Button asChild variant="secondary" className="w-full sm:w-auto">
            <Link href="/dashboard/join-room">
              <ArrowRight className="mr-2 h-4 w-4" />
              Entrar com Código
            </Link>
          </Button>
        </div>
      </div>
      <div className="mt-6">
        <RoomList />
      </div>
    </div>
  );
}
