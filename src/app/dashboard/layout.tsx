'use client';

import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import { CallProviderWrapper } from '@/components/webrtc/call-provider-wrapper';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CallProviderWrapper>
      <div className="flex min-h-screen w-full flex-col">
        <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-50">
          <Logo />
          <div className="ml-auto">
            <UserNav />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {children}
        </main>
      </div>
    </CallProviderWrapper>
  );
}
