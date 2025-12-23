'use client';

import { CallProvider } from '@/contexts/call-context';
import { CallUI } from './call-ui';
import { CallNotification } from './call-notification';
import { useEffect, useState } from 'react';

// Simplified hook to get user since we are client side
// In a real app we might use a dedicated auth context
function useCurrentUser() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // Fetch current user from API
        fetch('/api/auth/me')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.user) {
                    setUser(data.user);
                }
            })
            .catch(err => console.error('Error fetching user for calls:', err));
    }, []);

    return user;
}

export function CallProviderWrapper({ children }: { children: React.ReactNode }) {
    const currentUser = useCurrentUser();

    return (
        <CallProvider currentUser={currentUser}>
            {children}
            <CallUI />
            <CallNotification />
        </CallProvider>
    );
}
