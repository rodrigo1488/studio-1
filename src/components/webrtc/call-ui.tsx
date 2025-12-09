'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useCall } from '@/contexts/call-context';

interface CallUIProps {
  roomId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  onCallEnd?: () => void;
}

export function CallUI({
  roomId,
  currentUserId,
  otherUserId,
  otherUserName,
  onCallEnd,
}: CallUIProps) {
  const {
    status,
    callType,
    manager,
    endCall,
    toggleMute,
    toggleVideo,
    isMuted: getIsMuted,
    isVideoEnabled: getIsVideoEnabled,
    getLocalStream,
  } = useCall();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Atualiza vídeo local
  useEffect(() => {
    const updateLocalVideo = () => {
      const localStream = getLocalStream();
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    };

    const interval = setInterval(updateLocalVideo, 100);
    return () => clearInterval(interval);
  }, [getLocalStream, status]);

  // Escuta stream remoto do manager
  useEffect(() => {
    if (!manager) return;

    // Configura callback para stream remoto se ainda não estiver configurado
    const setupRemoteStream = () => {
      if (manager && (manager as any).callbacks) {
        const originalOnRemoteStream = (manager as any).callbacks.onRemoteStream;
        (manager as any).callbacks.onRemoteStream = (stream: MediaStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          if (originalOnRemoteStream) {
            originalOnRemoteStream(stream);
          }
        };
      }
    };

    setupRemoteStream();
  }, [manager]);

  // Atualiza estados de mute/video
  useEffect(() => {
    setIsMuted(getIsMuted());
    setIsVideoEnabled(getIsVideoEnabled());
  }, [getIsMuted, getIsVideoEnabled, status]);

  const handleEndCall = () => {
    endCall();
    onCallEnd?.();
  };

  const handleToggleMute = () => {
    const newMuted = !toggleMute();
    setIsMuted(!newMuted);
  };

  const handleToggleVideo = () => {
    const newEnabled = toggleVideo();
    setIsVideoEnabled(newEnabled);
  };

  // Tela de chamada em andamento
  if (status === 'calling' || status === 'connected') {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>
              {status === 'calling' ? 'Chamando...' : 'Em chamada'}
            </DialogTitle>
            <DialogDescription>{otherUserName}</DialogDescription>
          </DialogHeader>

          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            {/* Vídeo remoto */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Vídeo local (picture-in-picture) */}
            {callType === 'video' && (
              <div className="absolute top-4 right-4 w-32 h-24 bg-black rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Overlay quando chamando */}
            {status === 'calling' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <div className="animate-pulse mb-4">
                    <Phone className="h-16 w-16 mx-auto" />
                  </div>
                  <p className="text-lg">Chamando {otherUserName}...</p>
                </div>
              </div>
            )}

            {/* Controles */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              <Button
                onClick={handleToggleMute}
                variant={isMuted ? 'destructive' : 'secondary'}
                size="icon"
                className="h-12 w-12 rounded-full"
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>

              {callType === 'video' && (
                <Button
                  onClick={handleToggleVideo}
                  variant={isVideoEnabled ? 'secondary' : 'destructive'}
                  size="icon"
                  className="h-12 w-12 rounded-full"
                >
                  {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                </Button>
              )}

              <Button
                onClick={handleEndCall}
                variant="destructive"
                size="icon"
                className="h-12 w-12 rounded-full"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
