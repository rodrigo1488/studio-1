'use client';

import { DashboardSidebarProvider } from '@/components/dashboard-sidebar';
import { BottomNav } from '@/components/bottom-nav';

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardSidebarProvider>
      <div className="flex min-h-screen w-full flex-col pb-20">
        {children}
      </div>
      <BottomNav />
    </DashboardSidebarProvider>
  );
}
