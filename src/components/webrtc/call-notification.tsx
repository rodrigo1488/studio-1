'use client';

import { useCall } from '@/contexts/call-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Phone, PhoneOff } from 'lucide-react';

export function CallNotification() {
    const { incomingCall, acceptCall, rejectCall } = useCall();

    if (!incomingCall) return null;

    return (
        <div className="fixed top-4 right-4 z-[100] w-80 animate-in slide-in-from-top-2">
            <Card className="p-4 shadow-xl border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                            <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold">{incomingCall.fromName}</p>
                            <p className="text-sm text-muted-foreground">Chamada de {incomingCall.callType}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => acceptCall(incomingCall.callType)}
                        >
                            Atender
                        </Button>
                        <Button
                            className="flex-1"
                            variant="destructive"
                            onClick={rejectCall}
                        >
                            Recusar
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
