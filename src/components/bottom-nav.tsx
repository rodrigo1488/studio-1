'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, MessageSquare, UserPlus, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/dashboard-sidebar';

const navItems = [
  {
    label: 'Feed',
    icon: ImageIcon,
    href: '/feed',
    activePaths: ['/feed'],
    color: '#F59E0B',
  },
  {
    label: 'Grupos',
    icon: Users,
    href: '/dashboard',
    view: 'groups',
    color: '#3B82F6',
  },
  {
    label: 'Conversas',
    icon: MessageSquare,
    href: '/dashboard',
    view: 'conversations',
    color: '#EC4899',
  },
  {
    label: 'Contatos',
    icon: UserPlus,
    href: '/dashboard',
    view: 'contacts',
    color: '#10B981',
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const sidebar = useSidebar();

  const handleClick = (item: typeof navItems[0], e: React.MouseEvent) => {
    // Se for feed, apenas navegar
    if (item.href === '/feed') {
      return;
    }
    
    // Se for dashboard, mudar a view no contexto e navegar
    if (item.view && sidebar) {
      e.preventDefault();
      const targetView = item.view as 'groups' | 'conversations' | 'contacts' | 'feed';
      
      // Atualizar a view no contexto primeiro
      sidebar.setActiveView(targetView);
      
      // Navegar para o dashboard com query param para garantir sincronização
      router.push(`/dashboard?view=${targetView}`);
    }
  };

  const isActive = (item: typeof navItems[0]) => {
    if (item.activePaths) {
      return item.activePaths.some(path => pathname === path);
    }
    // Para itens que usam view, verificar se a view ativa corresponde
    if (item.view && sidebar) {
      return sidebar.activeView === item.view && pathname === '/dashboard';
    }
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={(e) => handleClick(item, e)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200',
                'hover:bg-muted/50 rounded-lg active:scale-95'
              )}
            >
              <div className="relative flex items-center justify-center">
                <Icon 
                  className={cn(
                    'h-6 w-6 transition-all',
                    active 
                      ? item.color 
                        ? '' 
                        : 'text-primary'
                      : 'text-muted-foreground'
                  )}
                  style={active && item.color ? { color: item.color } : undefined}
                />
                {active && (
                  <div 
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: item.color || 'currentColor' }}
                  />
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium leading-tight',
                active 
                  ? item.color 
                    ? '' 
                    : 'text-primary'
                  : 'text-muted-foreground'
              )}
              style={active && item.color ? { color: item.color } : undefined}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
