'use client';

import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { ContactRequestsNotification } from '@/components/notifications/contact-requests-notification';
import { AllNotifications } from '@/components/notifications/all-notifications';
import { CallProviderWrapper } from '@/components/webrtc/call-provider-wrapper';
import {
  DashboardSidebarProvider,
} from '@/components/dashboard-sidebar';
import { BottomNav } from '@/components/bottom-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CallProviderWrapper>
      <DashboardSidebarProvider>
        <div className="flex min-h-screen w-full flex-col">
          <header className="sticky top-0 flex h-16 items-center gap-2 sm:gap-4 border-b-2 border-primary/30 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 backdrop-blur-sm px-2 sm:px-4 md:px-6 z-50 shadow-md">
            <Logo />
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <AllNotifications />
              <ContactRequestsNotification />
              <ThemeToggle />
              <UserNav />
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-2 sm:gap-4 p-2 sm:p-4 md:gap-8 md:p-8 overflow-auto min-w-0 pb-20">
            {children}
          </main>
          <BottomNav />
        </div>
      </DashboardSidebarProvider>
    </CallProviderWrapper>
  );
}
