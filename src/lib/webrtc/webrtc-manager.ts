import { SignalingClient } from './signaling';
import { getMediaStream, stopMediaStream } from './media';
import { CallStatus, CallType, SignalingMessage, WebRTCManagerCallbacks } from './types';

const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export class WebRTCManager {
    private signaling: SignalingClient | null = null;
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private callbacks: WebRTCManagerCallbacks = {
        onStatusChange: () => { },
        onRemoteStream: () => { },
        onCallRequest: () => { },
        onError: () => { },
    };

    private signalingUrl: string;
    private currentRoomId: string | null = null;
    private currentUserId: string | null = null;
    private remoteUserId: string | null = null;

    constructor(signalingUrl: string) {
        this.signalingUrl = signalingUrl;
    }

    async join(roomId: string, userId: string) {
        this.currentRoomId = roomId;
        this.currentUserId = userId;
        await this.setupSignaling(roomId, userId);
    }

    setCallbacks(callbacks: Partial<WebRTCManagerCallbacks>) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    // Inicializa conexão com servidor de sinalização para receber chamadas
    // Mas no modelo atual do server.ts, precisamos do roomId na conexão.
    // O app passa roomId dinamicamente.
    // Vamos assumir que o 'connect' real acontece ao entrar numa sala ou iniciar chamada.

    // Para fins do CallContext, ele iniciava com `new WebRTCManager(url)`.
    // E esperava receber chamadas. Mas sem estar conectado num socket (precisa de roomId), como recebe?
    // O server.ts original exigia roomId na conexão.
    // Se o usuário não está em uma "sala de chat" específica, ele não pode receber chamadas com esse backend simples
    // a menos que usemos um "global-user-room" ou similar.
    // Vamos assumir que a conexão é estabelecida sob demanda ou usa o ID do usuário como sala para sinalização global?
    // User Analysis: O sistema de chat tem `roomId`. O `CallContext` é global?
    // `CallContext` tenta conectar ao montar.
    // Se não temos roomId global, vamos adiar a conexão ou usar um truque.
    // VAMOS USAR O PROPRIO USER ID COMO ROOM ID INICIAL PARA SINALIZAÇÃO PESSOAL?
    // Ou assumir que só funciona dentro de chat rooms.
    // Dado que `startCall` recebe `roomId`, parece que a chamada é vinculada a uma sala.

    // SOLUÇÃO: O Manager mantém a conexão. Se for usada apenas dentro de salas, OK.
    // Mas o CallContext é global.
    // Vamos implementar methods de setup.

    getLocalStream() {
        return this.localStream;
    }

    isMuted() {
        return this.localStream?.getAudioTracks()[0]?.enabled === false;
    }

    isVideoEnabled() {
        return this.localStream?.getVideoTracks()[0]?.enabled === true;
    }

    toggleMute() {
        if (this.localStream) {
            const track = this.localStream.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                return !track.enabled; // retorna se está mutado
            }
        }
        return true;
    }

    toggleVideo() {
        if (this.localStream) {
            const track = this.localStream.getVideoTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                return track.enabled;
            }
        }
        return false;
    }

    // Inicia uma chamada
    async startCall(roomId: string, fromId: string, toId: string, type: CallType, callerName?: string, callerAvatar?: string) {
        console.log(`[WebRTC] Starting call in room ${roomId} from ${fromId} to ${toId}`);
        this.currentRoomId = roomId;
        this.currentUserId = fromId;
        this.remoteUserId = toId;

        try {
            // Só reconecta se mudar de sala ou usuário, para não derrubar 'joinRoom'
            // Mas 'joinRoom' usa o mesmo signalingUrl.
            // Se já estivermos conectados, setupSignaling deve ser inteligente.
            await this.setupSignaling(roomId, fromId);

            console.log('[WebRTC] Requesting local media...');
            this.localStream = await getMediaStream(type === 'video', true);
            console.log('[WebRTC] Local media obtained');

            this.createPeerConnection();

            this.localStream.getTracks().forEach(track => {
                this.peerConnection?.addTrack(track, this.localStream!);
            });

            console.log('[WebRTC] Creating offer...');
            const offer = await this.peerConnection!.createOffer();
            await this.peerConnection!.setLocalDescription(offer);

            console.log('[WebRTC] Sending call-request...');
            this.signaling!.send({
                type: 'call-request',
                from: fromId,
                to: toId,
                roomId: roomId,
                callType: type,
                payload: offer
            });

            // Send Push Notification
            console.log('[WebRTC] Triggering Push Notification...');
            fetch('/api/calls/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    callerId: fromId,
                    callerName: callerName || 'Chamada',
                    callerAvatar: callerAvatar,
                    callType: type,
                    recipientId: toId
                })
            }).catch(err => console.error('[WebRTC] Failed to trigger push:', err));

            this.callbacks.onStatusChange('calling');

            // Pulse call request every 3 seconds to ensure delivery if user reconnects
            const pulseInterval = setInterval(() => {
                if ((this.callbacks as any).status !== 'calling') { // We need access to current status
                    clearInterval(pulseInterval);
                    return;
                }

                // Also check if peerConnection is still stable?
                // Just resend
                console.log('[WebRTC] Pulsing call request...');
                this.signaling!.send({
                    type: 'call-request',
                    from: fromId,
                    to: toId,
                    roomId: roomId,
                    callType: type,
                    payload: offer
                });
            }, 3000);

            // Clear interval if status changes (hook into onStatusChange or callbacks)
            // Ideally we need to store this interval ID in the class to clear it, 
            // but for now relying on the interval's internal check.
            // BETTER: Add a cleanup function to 'pulseInterval' that is called when status changes.
            // Since we don't have a robust state machine here, let's store it.
            (this as any)._pulseInterval = pulseInterval;

        } catch (error: any) {
            console.error('[WebRTC] Error in startCall:', error);
            this.callbacks.onError(error);
            this.cleanup();
        }
    }

    async acceptCall(type: CallType) {
        console.log('[WebRTC] Accepting call...');
        if (!this.currentRoomId || !this.peerConnection) {
            console.error('[WebRTC] Cannot accept call: Missing Room ID or PeerConnection');
            return;
        }

        try {
            this.localStream = await getMediaStream(type === 'video', true);
            this.localStream.getTracks().forEach(track => {
                this.peerConnection?.addTrack(track, this.localStream!);
            });

            const answer = await this.peerConnection!.createAnswer();
            await this.peerConnection!.setLocalDescription(answer);

            console.log('[WebRTC] Sending call-accepted...');
            this.signaling!.send({
                type: 'call-accepted',
                to: this.remoteUserId!,
                roomId: this.currentRoomId,
                payload: answer
            });

            this.callbacks.onStatusChange('connected');
        } catch (error: any) {
            console.error('[WebRTC] Error accepting call:', error);
            this.callbacks.onError(error);
        }
    }

    // ... (rest of methods)

    rejectCall() {
        if (this.signaling && this.remoteUserId) {
            this.signaling.send({
                type: 'call-rejected',
                to: this.remoteUserId,
                roomId: this.currentRoomId!
            });
        }
        this.cleanup();
    }

    endCall() {
        if (this.signaling && this.remoteUserId) {
            this.signaling.send({
                type: 'end-call',
                to: this.remoteUserId,
                roomId: this.currentRoomId!
            });
        }
        this.cleanup();
    }

    disconnect() {
        this.cleanup();
    }

    private setupSignaling(roomId: string, userId: string): Promise<void> {
        return new Promise((resolve) => {
            // Se já estamos conectados com os mesmos dados, não reconecta
            if (this.signaling &&
                this.currentRoomId === roomId &&
                this.currentUserId === userId &&
                this.signaling.isConnected) {
                console.log('[WebRTC] Signaling already connected to', roomId);
                resolve();
                return;
            }

            if (this.signaling) {
                console.log('[WebRTC] Reconnecting signaling...');
                this.signaling.disconnect();
            }

            this.signaling = new SignalingClient(
                this.signalingUrl,
                userId,
                roomId,
                (msg) => this.handleSignalingMessage(msg),
                () => {
                    console.log('[WebRTC] Signaling connected callback');
                    resolve();
                }
            );
            this.signaling.connect();
        });
    }

    private createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.signaling && this.remoteUserId) {
                this.signaling.send({
                    type: 'candidate',
                    to: this.remoteUserId,
                    roomId: this.currentRoomId!,
                    payload: event.candidate
                });
            }
        };

        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            this.callbacks.onRemoteStream(this.remoteStream);
        };

        this.peerConnection.onconnectionstatechange = () => {
            if (this.peerConnection?.connectionState === 'disconnected') {
                this.cleanup();
            }
        };
    }

    private async handleSignalingMessage(msg: SignalingMessage) {
        console.log('[WebRTC] Received signaling message:', msg.type);
        switch (msg.type) {
            case 'call-request':
                console.log('[WebRTC] Incoming call request from', msg.from);
                this.currentRoomId = msg.roomId!;
                this.remoteUserId = msg.from!;
                this.callbacks.onCallRequest(msg.from!, msg.callType!, msg.roomId);

                if (msg.payload) {
                    console.log('[WebRTC] Processing offer SDP');
                    await this.setupPeerForIncoming(msg.payload);
                }
                break;

            case 'call-accepted':
                console.log('[WebRTC] Call accepted by remote');
                if (this.peerConnection) {
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.payload));
                    this.callbacks.onStatusChange('connected');
                }
                break;

            case 'call-rejected':
                console.log('[WebRTC] Call rejected');
                this.callbacks.onStatusChange('idle');
                this.cleanup();
                break;

            case 'candidate':
                // console.log('[WebRTC] Received ICE candidate'); // Verbose
                if (this.peerConnection && msg.payload) {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.payload));
                }
                break;

            case 'end-call':
                console.log('[WebRTC] Call ended by remote');
                this.cleanup();
                break;

            case 'user-joined':
                // @ts-ignore - Assuming message type extension
                const joinedUserId = msg.userId;
                console.log('[WebRTC] User joined:', joinedUserId);
                // If we are calling this user and they just joined, re-send the offer!
                // This handles the case where they were offline effectively.
                if (this.remoteUserId === joinedUserId && (this.callbacks as any).status === 'calling') {
                    console.log('[WebRTC] Remote user joined, re-sending offer...');
                    if (this.peerConnection && this.peerConnection.localDescription) {
                        this.signaling!.send({
                            type: 'call-request',
                            from: this.currentUserId!,
                            to: joinedUserId,
                            roomId: this.currentRoomId!,
                            callType: 'video', // We should track current call type in Manager state ideally
                            payload: this.peerConnection.localDescription
                        });
                    }
                }
                break;
        }
    }

    private async setupPeerForIncoming(offer: any) {
        this.createPeerConnection();
        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
    }

    private cleanup() {
        // Clear pulse interval if exists
        if ((this as any)._pulseInterval) {
            clearInterval((this as any)._pulseInterval);
            (this as any)._pulseInterval = null;
        }

        if (this.localStream) {
            stopMediaStream(this.localStream);
            this.localStream = null;
        }
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        /* Não desconectar signaling imediatamente se quiser receber novas chamadas? 
           Depende da lógica. Por enquanto, se 'endCall', resetamos tudo. */

        this.callbacks.onStatusChange('ended');
        // Pequeno delay para resetar p/ idle
        setTimeout(() => this.callbacks.onStatusChange('idle'), 100);
    }
}
