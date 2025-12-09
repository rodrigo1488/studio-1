'use client';

import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import { CallProviderWrapper } from '@/components/webrtc/call-provider-wrapper';
import {
  DashboardSidebarProvider,
  DashboardSidebarMobile,
  DashboardSidebarDesktop,
} from '@/components/dashboard-sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CallProviderWrapper>
      <DashboardSidebarProvider>
        <div className="flex min-h-screen w-full flex-col">
          <header className="sticky top-0 flex h-16 items-center gap-4 border-b-2 border-primary/30 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 backdrop-blur-sm px-4 md:px-6 z-50 shadow-md">
            <DashboardSidebarMobile />
            <Logo />
            <div className="ml-auto">
              <UserNav />
            </div>
          </header>
          <div className="flex flex-1 overflow-hidden">
            <DashboardSidebarDesktop />
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 overflow-auto min-w-0">
              {children}
            </main>
          </div>
        </div>
      </DashboardSidebarProvider>
    </CallProviderWrapper>
  );
}
