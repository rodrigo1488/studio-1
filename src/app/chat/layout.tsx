'use client';

import { CallProviderWrapper } from '@/components/webrtc/call-provider-wrapper';
import { NotificationManager } from '@/components/notifications/notification-manager';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CallProviderWrapper>
      {children}
      <NotificationManager />
    </CallProviderWrapper>
  );
}

