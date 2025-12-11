'use client';

import { CallProviderWrapper } from '@/components/webrtc/call-provider-wrapper';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CallProviderWrapper>
      {children}
    </CallProviderWrapper>
  );
}

