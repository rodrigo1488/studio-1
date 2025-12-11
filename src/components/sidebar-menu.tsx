'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MessageSquare, UserPlus, PlusCircle, ArrowRight, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import RoomList from '@/app/dashboard/components/room-list';
import DirectConversationsList from '@/app/dashboard/components/direct-conversations-list';
import ContactsList from '@/app/dashboard/components/contacts-list';
import { FeedPreview } from '@/components/feed/feed-preview';

export function SidebarMenu() {
  const [activeTab, setActiveTab] = useState('direct');
  const pathname = usePathname();
  const isInFeed = pathname === '/feed';

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Grupos
          </TabsTrigger>
          <TabsTrigger value="direct" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversas
          </TabsTrigger>
          <TabsTrigger value="feed" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="flex-1 overflow-auto mt-0 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
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
        </TabsContent>

        <TabsContent value="direct" className="flex-1 overflow-auto mt-0 space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Contatos</h3>
              <ContactsList />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Conversas Diretas</h3>
              <DirectConversationsList />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="feed" className="flex-1 overflow-auto mt-0 p-2 sm:p-4">
          {isInFeed ? (
            <div className="space-y-3">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Link>
              </Button>
              <p className="text-xs sm:text-sm text-muted-foreground text-center">
                Você está visualizando o feed completo
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <FeedPreview />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

