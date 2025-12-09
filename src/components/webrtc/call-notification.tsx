'use client';

import { useCall } from '@/contexts/call-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { CallUI } from './call-ui';

export function CallNotification() {
  const { incomingCall, status, acceptCall, rejectCall, currentCall } = useCall();

  const handleAccept = async () => {
    if (!incomingCall) return;
    try {
      await acceptCall(incomingCall.callType);
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  const handleReject = () => {
    rejectCall();
  };

  // Mostra notificação de chamada recebida
  if (status === 'ringing' && incomingCall) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chamada recebida</DialogTitle>
            <DialogDescription>
              {incomingCall.fromName} está chamando você ({incomingCall.callType === 'video' ? 'vídeo' : 'áudio'})
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 justify-center mt-4">
            <Button
              onClick={handleAccept}
              className="bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Phone className="h-5 w-5 mr-2" />
              Atender
            </Button>
            <Button
              onClick={handleReject}
              variant="destructive"
              size="lg"
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              Recusar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}

