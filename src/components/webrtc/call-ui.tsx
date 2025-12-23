'use client';

import { useCall } from '@/contexts/call-context';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useEffect, useRef } from 'react';

export function CallUI() {
    const { currentCall, status, endCall, toggleMute, toggleVideo, isMuted, isVideoEnabled, getLocalStream, remoteStream } = useCall();
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (status === 'connected' || status === 'calling') {
            const stream = getLocalStream();
            if (stream && localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
        }
    }, [status, getLocalStream]);

    useEffect(() => {
        if (status === 'connected' && remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [status, remoteStream]);

    if (status === 'idle' || !currentCall) return null;

    return (
        <Dialog open={true} onOpenChange={() => endCall()}>
            <DialogContent className="sm:max-w-3xl h-[80vh] bg-black border-none p-0 overflow-hidden">
                <div className="relative w-full h-full flex flex-col">
                    <div className="flex-1 bg-zinc-900 relative">
                        {/* Remote Video */}
                        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

                        {/* Local Video (PIP) */}
                        <div className="absolute top-4 right-4 w-32 h-48 bg-black rounded-lg overflow-hidden border border-zinc-700 shadow-xl">
                            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        </div>
                    </div>

                    <div className="h-20 bg-black/80 flex items-center justify-center gap-6 absolute bottom-0 w-full">
                        <Button variant="outline" size="icon" onClick={toggleMute} className="rounded-full h-12 w-12">
                            {isMuted() ? <MicOff /> : <Mic />}
                        </Button>

                        <Button variant="destructive" size="icon" onClick={endCall} className="rounded-full h-14 w-14">
                            <PhoneOff className="h-6 w-6" />
                        </Button>

                        <Button variant="outline" size="icon" onClick={toggleVideo} className="rounded-full h-12 w-12">
                            {isVideoEnabled() ? <Video /> : <VideoOff />}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
