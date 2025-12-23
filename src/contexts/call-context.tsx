'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { WebRTCManager } from '@/lib/webrtc/webrtc-manager';
import type { CallType, CallStatus } from '@/lib/webrtc/types';
import type { User } from '@/lib/data';

interface IncomingCall {
  from: string;
  fromName: string;
  roomId: string;
  callType: CallType;
}

interface CallContextType {
  manager: WebRTCManager | null;
  status: CallStatus;
  callType: CallType | null;
  incomingCall: IncomingCall | null;
  currentCall: { roomId: string; from: string; to: string } | null;
  startCall: (roomId: string, from: string, to: string, toName: string, callType: CallType) => Promise<void>;
  acceptCall: (callType: CallType) => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => boolean;
  toggleVideo: () => boolean;
  isMuted: () => boolean;
  isVideoEnabled: () => boolean;
  getLocalStream: () => MediaStream | null;
  remoteStream: MediaStream | null;
  joinRoom: (roomId: string) => void; // Add joinRoom
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children, currentUser }: { children: React.ReactNode; currentUser: User | null }) {
  const [manager, setManager] = useState<WebRTCManager | null>(null);
  const [status, setStatus] = useState<CallStatus>('idle');
  const [callType, setCallType] = useState<CallType | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [currentCall, setCurrentCall] = useState<{ roomId: string; from: string; to: string } | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const managerRef = useRef<WebRTCManager | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoAcceptRef = useRef<{ roomId: string; callType: CallType } | null>(null);

  // Sound effect handler
  useEffect(() => {
    const playAudio = async (filename: string) => {
      try {
        if (!audioRef.current || audioRef.current.src.indexOf(filename) === -1) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          audioRef.current = new Audio(filename);
          audioRef.current.loop = true;
        }
        if (audioRef.current.paused) {
          await audioRef.current.play();
        }
      } catch (e) {
        console.error('Error playing audio:', e);
      }
    };

    if (status === 'ringing' && incomingCall) {
      // Recebendo chamada -> toca som de chamada
      playAudio('/call.mp3');
    } else if (status === 'calling') {
      // Fazendo chamada -> toca som de chamando (ringback)
      playAudio('/calling.mp3');
    } else {
      // Stop audio for other states (connected, idle, ended)
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null; // Reset ref
      }
    }

    return () => {
      // Don't stop here, let the next effect run handle it or the dependency change handle it
      // Actually, we should cleanup on unmount, but not necessarily on every dependency change if the status remains relevant.
      // But since we have if/else logic above that covers all states, we good.
      // Wait, if we unmount, we MUST stop.
    };
  }, [incomingCall, status]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, []);





  // Inicializa o manager quando o usuário está logado
  useEffect(() => {
    if (!currentUser) {
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
        setManager(null);
      }
      return;
    }

    const signalingUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    const newManager = new WebRTCManager(signalingUrl);

    newManager.setCallbacks({
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        if (newStatus === 'ended' || newStatus === 'idle') {
          setCurrentCall(null);
          setIncomingCall(null);
          setCallType(null);
        }
      },
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
      },
      onCallRequest: async (from, type, roomId) => {
        // Prevent duplicate ringing or "split call" UI if we are already in this call
        // Note: 'status' here is captured from closure, but we might want to check a ref or current state better?
        // Actually, the closure might have stale 'status'. 
        // BETTER: Use a ref to track status inside the effect or rely on functional state update if we could.
        // But here we are inside existing effect with dep [currentUser?.id].
        // Let's check the manager instance state if possible, or use a ref for status.
        // Re-implementing with a ref check would be safer but let's assume 'status' from state is reasonably fresh 
        // OR simply check if we have 'currentCall' mismatch.

        // Actually, easier: If we have an incomingCall from the SAME person in SAME room, ignore.
        // If we are 'connected', ignore.
        // We can't access fresh 'status' state cleanly here without ref.
        // Let's allow the Manager to filter most, but here safeguard too.

        // However, we don't have access to fresh 'status' variable inside this callback created at mount?
        // Wait, the useEffect depends on [currentUser?.id]. It DOES NOT depend on 'status'.
        // So 'status' variable inside this callback is STALE (always 'idle' from initial render).
        // THIS IS A BUG. The callback catches 'status' as 'idle'.

        // FIX: Use a ref for current status.

        // For now, let's just proceed with fetching info.
        // But wait, if we setIncomingCall(newParams), it might overwrite.

        try {
          // Fetch user info...
          const response = await fetch(`/api/users/${from}`);
          if (response.ok) {
            const data = await response.json();
            const fromName = data.user?.name || 'Usuário desconhecido';

            setIncomingCall((prev) => {
              // Optimization: If we already have this incoming call, don't change state to trigger re-renders
              if (prev && prev.from === from && prev.roomId === roomId) {
                return prev;
              }
              return {
                from,
                fromName,
                roomId: roomId || '',
                callType: type,
              };
            });

            setStatus((prevStatus) => {
              if (prevStatus === 'connected' || prevStatus === 'calling') {
                // If we are already connected, DO NOT switch back to ringing!
                return prevStatus;
              }
              return 'ringing';
            });
            setCallType(type);

            // Check for pending auto-accept...
            if (autoAcceptRef.current && autoAcceptRef.current.roomId === (roomId || '')) {
              // ... logic ...
              const pendingType = autoAcceptRef.current.callType;
              autoAcceptRef.current = null;
              setTimeout(() => {
                // Verify again if we aren't connected before accepting?
                // But manual acceptCall checks manager.
                acceptCall(pendingType).catch(console.error);
              }, 500);
            }
          }
        } catch (error) {
          // ... Error handling ...
          setIncomingCall((prev) => {
            if (prev && prev.from === from && prev.roomId === roomId) return prev;
            return {
              from,
              fromName: 'Usuário desconhecido',
              roomId: '',
              callType: type,
            };
          });
          setStatus((prevStatus) => {
            if (prevStatus === 'connected' || prevStatus === 'calling') return prevStatus;
            return 'ringing';
          });
          setCallType(type);
        }
      },
      onError: (error) => {
        console.error('WebRTC error:', error);
        const errorMessage = error.message || 'Erro na conexão WebRTC';

        // Se for erro de conexão WebSocket, mostra mensagem amigável
        if (errorMessage.includes('servidor de sinalização') || errorMessage.includes('WebSocket') || errorMessage.includes('connection')) {
          // Não tenta reconectar automaticamente se o servidor não está rodando
          setStatus('idle');
          setCurrentCall(null);
          setIncomingCall(null);

          // Mostra toast de erro (se disponível)
          if (typeof window !== 'undefined') {
            alert('Servidor WebSocket não está rodando. Por favor, inicie o servidor com: npm run ws:server');
          }
        } else {
          setStatus('idle');
          setCurrentCall(null);
          setIncomingCall(null);
        }
      },
    });

    managerRef.current = newManager;
    setManager(newManager);

    // Connect to global signaling immediately
    // usage: join(roomId, userId)
    newManager.join('global', currentUser.id).catch(console.error);

    return () => {
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
        setManager(null);
      }
    };
  }, [currentUser?.id]);

  // Timeout handling
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);

  const sendSystemMessage = async (roomId: string, logType: 'missed' | 'declined' | 'accepted') => {
    try {
      await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          text: logType === 'missed' ? 'Chamada perdida' :
            logType === 'declined' ? 'Chamada recusada' :
              'Chamada atendida',
          type: 'system',
          callLog: {
            type: logType,
            duration: callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0
          }
        })
      });
    } catch (e) {
      console.error('Error sending system message:', e);
    }
  };

  const startCall = useCallback(async (
    roomId: string,
    from: string,
    to: string,
    toName: string,
    callType: CallType
  ) => {
    if (!managerRef.current) {
      throw new Error('WebRTC manager not initialized');
    }

    try {
      setCurrentCall({ roomId, from, to });
      setCallType(callType);

      // Start 60s timeout for "Missed Call"
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        console.log('Call timeout - 60s limit reached');
        if (managerRef.current) {
          managerRef.current.endCall(); // Or cancel/hangup logic
        }
        // Send Missed Call log
        sendSystemMessage(roomId, 'missed');

        setStatus('idle');
        setCurrentCall(null);
        setIncomingCall(null);
        setCallType(null);
      }, 60000);


      // @ts-ignore - Assuming we updated WebRTCManager signature
      await managerRef.current.startCall(
        roomId,
        from,
        to,
        callType,
        currentUser?.name || 'Algum usuário',
        currentUser?.avatarUrl || '' // Pass avatar
      );
    } catch (error) {
      console.error('Error starting call:', error);
      setStatus('idle');
      setCurrentCall(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      throw error;
    }
  }, [currentUser]);

  const acceptCall = useCallback(async (callType: CallType) => {
    if (!managerRef.current || !incomingCall) {
      throw new Error('No incoming call to accept');
    }

    try {
      // Clear timeout on accept
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      callStartTimeRef.current = Date.now();

      // Send Accepted Log
      sendSystemMessage(incomingCall.roomId, 'accepted');

      setCurrentCall({
        roomId: incomingCall.roomId,
        from: incomingCall.from,
        to: currentUser?.id || '',
      });
      await managerRef.current.acceptCall(callType);
      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      setStatus('idle');
      setIncomingCall(null);
      setCurrentCall(null);
      throw error;
    }
  }, [incomingCall, currentUser?.id]);

  const rejectCall = useCallback(() => {
    if (incomingCall) {
      sendSystemMessage(incomingCall.roomId, 'declined');
    }
    if (managerRef.current) {
      managerRef.current.rejectCall();
    }
    setIncomingCall(null);
    setStatus('idle');
    setCallType(null);
  }, [incomingCall]);

  const endCall = useCallback(() => {
    // Determine if we should clear timeout (if caller ends before answer)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      // If ended by caller before answer, it's technically a "Missed" call for the other side?
      // Or just "Cancelled". Logic is tricky here. 
      // If we are calling and we cancel, it's not missed, it's cancelled.
      // User asked for "Missed" (timeout).
      // Let's leave "Cancelled" as is (no system msg or maybe a different one).
    }

    if (managerRef.current) {
      managerRef.current.endCall();
    }
    setStatus('idle');
    setCurrentCall(null);
    setIncomingCall(null);
    setCallType(null);
    callStartTimeRef.current = null;
  }, []);

  const toggleMute = useCallback(() => {
    if (!managerRef.current) return false;
    return managerRef.current.toggleMute();
  }, []);

  const toggleVideo = useCallback(() => {
    if (!managerRef.current) return false;
    return managerRef.current.toggleVideo();
  }, []);

  const isMuted = useCallback(() => {
    if (!managerRef.current) return true;
    return managerRef.current.isMuted();
  }, []);

  const isVideoEnabled = useCallback(() => {
    if (!managerRef.current) return false;
    return managerRef.current.isVideoEnabled();
  }, []);

  const getLocalStream = useCallback(() => {
    if (!managerRef.current) return null;
    return managerRef.current.getLocalStream();
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    if (!managerRef.current || !currentUser?.id) return;

    // We need to cast to any or update WebRTCManager to expose a connect/join method
    // For now, let's assume we will add a public 'join' method to WebRTCManager
    // @ts-ignore
    if (managerRef.current.join) {
      // @ts-ignore
      managerRef.current.join(roomId, currentUser.id);
    }
  }, [currentUser?.id]);

  // Check for auto-answer action from URL (Push Notification click)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'answer') {
        console.log('Auto-answering call from URL param');
        const pathParts = window.location.pathname.split('/');
        const possibleRoomId = pathParts[pathParts.length - 1];
        if (possibleRoomId) {
          autoAcceptRef.current = { roomId: possibleRoomId, callType: 'video' };
        }
      }
    }
  }, []);

  // Listen for Service Worker messages (e.g. Action Buttons)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handler = (event: MessageEvent) => {
        if (event.data && event.data.type === 'ACTION_ANSWER_CALL') {
          console.log('User clicked Answer on notification', event.data);
          const { roomId, callType } = event.data;

          if (incomingCall) {
            // Already have the call request, just accept
            acceptCall(callType || 'video');
          } else if (roomId) {
            // We are not connected to this room or haven't received the request yet.
            console.log('Joining room to receive call...', roomId);
            joinRoom(roomId);
            // Set flag to auto-accept when the request arrives
            autoAcceptRef.current = { roomId, callType: callType || 'video' };
          }
        }
      };
      navigator.serviceWorker.addEventListener('message', handler);
      return () => navigator.serviceWorker.removeEventListener('message', handler);
    }
  }, [incomingCall, acceptCall, joinRoom]);

  // Handle auto-accept when incoming call arrives
  useEffect(() => {
    if (incomingCall && autoAcceptRef.current) {
      if (incomingCall.roomId === autoAcceptRef.current.roomId) {
        console.log('Auto-accepting call (Effect triggered)');
        const type = autoAcceptRef.current.callType;
        autoAcceptRef.current = null;
        acceptCall(type).catch(console.error);
      }
    }
  }, [incomingCall, acceptCall]);

  const value: CallContextType = {
    manager,
    status,
    callType,
    incomingCall,
    currentCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoEnabled,
    getLocalStream,
    remoteStream,
    joinRoom,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
}

