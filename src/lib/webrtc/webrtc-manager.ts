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
    async startCall(roomId: string, fromId: string, toId: string, type: CallType) {
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

            this.callbacks.onStatusChange('calling');
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

            // ... (other cases with logs)
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
        }
    }

    private async setupPeerForIncoming(offer: any) {
        this.createPeerConnection();
        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
    }

    private cleanup() {
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
