'use client';

import { Button } from '@/components/ui/button';
import { useCall } from '@/contexts/call-context';
import { Phone, Video, Loader2 } from 'lucide-react';
import type { Room, User } from '@/lib/data';

interface CallButtonProps {
    room: Room;
    currentUser: User;
    otherUser: User | null;
    className?: string;
}

export function CallButton({ room, currentUser, otherUser, className }: CallButtonProps) {
    const { startCall, status } = useCall();

    const isDM = room.code?.startsWith('DM-');
    const canCall = isDM && otherUser && currentUser;

    const handleCall = async (type: 'audio' | 'video') => {
        if (!canCall || !otherUser) return;

        try {
            await startCall(room.id, currentUser.id, otherUser.id, otherUser.name, type);
        } catch (error) {
            console.error('Failed to start call:', error);
        }
    };

    if (!canCall) return null;

    const isBusy = status !== 'idle';

    return (
        <div className={`flex gap-1 sm:gap-2 ${className}`}>
            <Button
                size="icon"
                variant="ghost"
                onClick={() => handleCall('audio')}
                disabled={isBusy}
                className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 touch-manipulation"
                title="Chamada de áudio"
            >
                <Phone className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
            </Button>
            <Button
                size="icon"
                variant="ghost"
                onClick={() => handleCall('video')}
                disabled={isBusy}
                className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 touch-manipulation"
                title="Chamada de vídeo"
            >
                <Video className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
            </Button>
        </div>
    );
}
