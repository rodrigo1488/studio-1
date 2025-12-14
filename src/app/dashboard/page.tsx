'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PlusCircle, ArrowRight } from 'lucide-react';
import { useSidebar } from '@/components/dashboard-sidebar';
import RoomList from '@/app/dashboard/components/room-list';
import DirectConversationsList from '@/app/dashboard/components/direct-conversations-list';
import ContactsList from '@/app/dashboard/components/contacts-list';
import { FeedPreview } from '@/components/feed/feed-preview';

export default function DashboardPage() {
  const sidebar = useSidebar();
  const searchParams = useSearchParams();
  const activeView = sidebar?.activeView || 'conversations';

  // Sincronizar view com query params se necessário
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && sidebar && ['groups', 'conversations', 'contacts', 'feed'].includes(viewParam)) {
      sidebar.setActiveView(viewParam as 'groups' | 'conversations' | 'contacts' | 'feed');
    }
  }, [searchParams, sidebar]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      {activeView === 'groups' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
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
          <RoomList />
        </div>
      )}
      {activeView === 'conversations' && <DirectConversationsList />}
      {activeView === 'contacts' && <ContactsList />}
      {activeView === 'feed' && <FeedPreview />}
    </div>
  );
}
