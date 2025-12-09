'use client';

import { useState, createContext, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, UserPlus, Menu } from 'lucide-react';
import RoomList from '@/app/dashboard/components/room-list';
import DirectConversationsList from '@/app/dashboard/components/direct-conversations-list';
import ContactsList from '@/app/dashboard/components/contacts-list';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type SidebarView = 'groups' | 'conversations' | 'contacts';

const SidebarContext = createContext<{
  activeView: SidebarView;
  setActiveView: (view: SidebarView) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  closeMobileSidebar: () => void;
} | null>(null);

function SidebarContent() {
  const context = useContext(SidebarContext);
  if (!context) return null;

  const { activeView, setActiveView, setIsMobileOpen } = context;

  return (
    <div className="flex flex-col h-full">
      {/* Navigation Tabs */}
      <div className="flex border-b-2 border-primary/20 shrink-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
        <button
          onClick={() => setActiveView('groups')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-3 rounded-t-xl',
            activeView === 'groups'
              ? 'border-b-4 border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/10 shadow-sm'
              : 'border-transparent text-muted-foreground hover:text-[#3B82F6] hover:bg-[#3B82F6]/5'
          )}
        >
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Grupos</span>
        </button>
        <button
          onClick={() => setActiveView('conversations')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-3 rounded-t-xl',
            activeView === 'conversations'
              ? 'border-b-4 border-[#EC4899] text-[#EC4899] bg-[#EC4899]/10 shadow-sm'
              : 'border-transparent text-muted-foreground hover:text-[#EC4899] hover:bg-[#EC4899]/5'
          )}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Conversas</span>
        </button>
        <button
          onClick={() => setActiveView('contacts')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-3 rounded-t-xl',
            activeView === 'contacts'
              ? 'border-b-4 border-[#10B981] text-[#10B981] bg-[#10B981]/10 shadow-sm'
              : 'border-transparent text-muted-foreground hover:text-[#10B981] hover:bg-[#10B981]/5'
          )}
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Contatos</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {activeView === 'groups' && <RoomList />}
        {activeView === 'conversations' && <DirectConversationsList />}
        {activeView === 'contacts' && <ContactsList />}
      </div>
    </div>
  );
}

export function DashboardSidebarMobile() {
  const context = useContext(SidebarContext);
  if (!context) return null;

  const { isMobileOpen, setIsMobileOpen } = context;

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Abrir menu"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-[85vw] sm:w-[400px] p-0">
          <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
          <div className="h-full">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function DashboardSidebarDesktop() {
  return (
    <aside className="hidden lg:flex lg:w-80 xl:w-96 border-r bg-background flex-col h-[calc(100vh-4rem)] sticky top-16 z-40">
      <SidebarContent />
    </aside>
  );
}

export function DashboardSidebarProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<SidebarView>('groups');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  return (
    <SidebarContext.Provider value={{ activeView, setActiveView, isMobileOpen, setIsMobileOpen, closeMobileSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

// Hook para usar o contexto do sidebar
export function useSidebar() {
  const context = useContext(SidebarContext);
  return context; // Retorna null se não estiver no provider, ao invés de lançar erro
}

