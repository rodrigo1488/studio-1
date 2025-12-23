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
    // Se temos uma chamada entrando e status = 'ringing'
    if (incomingCall && status === 'ringing') {
      if (!audioRef.current) {
        audioRef.current = new Audio('/call.mp3');
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch(e => console.error('Error playing ringtone:', e));
    } else {
      // Stop audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [incomingCall, status]);





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
        // Busca informações do usuário que está chamando
        try {
          const response = await fetch(`/api/users/${from}`);
          if (response.ok) {
            const data = await response.json();
            const fromName = data.user?.name || 'Usuário desconhecido';

            // O roomId será definido quando receber a mensagem completa via handleSignalingMessage
            // Por enquanto, vamos buscar salas do usuário para encontrar a sala em comum
            // Mas isso é complexo, então vamos usar um estado temporário e atualizar depois
            setIncomingCall({
              from,
              fromName,
              roomId: roomId || '', // Usa o roomId da mensagem
              callType: type,
            });
            setStatus('ringing');
            setCallType(type);

            // Check for pending auto-accept
            if (autoAcceptRef.current && autoAcceptRef.current.roomId === (roomId || '')) {
              console.log('Auto-accepting call based on user action');
              // Clear ref to prevent double accept
              const pendingType = autoAcceptRef.current.callType;
              autoAcceptRef.current = null;
              // Delay slightly to ensure state update
              setTimeout(() => {
                acceptCall(pendingType).catch(console.error);
              }, 500);
            }
          }
        } catch (error) {
          console.error('Error fetching caller info:', error);
          setIncomingCall({
            from,
            fromName: 'Usuário desconhecido',
            roomId: '',
            callType: type,
          });
          setStatus('ringing');
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

    return () => {
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
        setManager(null);
      }
    };
  }, [currentUser?.id]);

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
      // Pass the actual caller name (currentUser's name) if we had it available in context, 
      // but 'startCall' args in context signature currently has 'toName'.
      // Wait, 'startCall' in Context receives (roomId, from, to, toName, type).
      // We don't have 'fromName' (current user name) easily accessible here unless we use 'currentUser' from provider props?
      // Actually CallProvider has 'currentUser' prop.
      // So we can pass currentUser.name.

      // Wait, 'currentUser' is available in CallProvider scope.
      // Let's use it.
      // @ts-ignore - Assuming we updated WebRTCManager signature
      await managerRef.current.startCall(
        roomId,
        from,
        to,
        callType,
        currentUser?.name || 'Algum usuário',
        currentUser?.image || '' // Pass avatar
      );
    } catch (error) {
      console.error('Error starting call:', error);
      setStatus('idle');
      setCurrentCall(null);
      throw error;
    }
  }, []);

  const acceptCall = useCallback(async (callType: CallType) => {
    if (!managerRef.current || !incomingCall) {
      throw new Error('No incoming call to accept');
    }

    try {
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
    if (managerRef.current) {
      managerRef.current.rejectCall();
    }
    setIncomingCall(null);
    setStatus('idle');
    setCallType(null);
  }, []);

  const endCall = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.endCall();
    }
    setStatus('idle');
    setCurrentCall(null);
    setIncomingCall(null);
    setCallType(null);
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

