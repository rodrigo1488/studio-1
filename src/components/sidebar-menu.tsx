'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MessageSquare, UserPlus } from 'lucide-react';
import RoomList from '@/app/dashboard/components/room-list';
import DirectConversationsList from '@/app/dashboard/components/direct-conversations-list';
import ContactsList from '@/app/dashboard/components/contacts-list';

export function SidebarMenu() {
  const [activeTab, setActiveTab] = useState('groups');

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Grupos
          </TabsTrigger>
          <TabsTrigger value="direct" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="flex-1 overflow-auto mt-0">
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
      </Tabs>
    </div>
  );
}

