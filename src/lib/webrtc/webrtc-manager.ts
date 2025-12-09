/**
 * Gerenciador principal de WebRTC
 * Orquestra peer connection, mídia e sinalização
 */

import { WebRTCPeer } from './peer';
import { MediaManager } from './media';
import { SignalingClient } from './signaling';
import type { CallType, CallStatus, SignalingMessage } from './types';

export interface CallCallbacks {
  onStatusChange?: (status: CallStatus) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
  onCallRequest?: (from: string, callType: CallType) => void;
}

export class WebRTCManager {
  private peer: WebRTCPeer;
  private media: MediaManager;
  private signaling: SignalingClient;
  private status: CallStatus = 'idle';
  private callType: CallType | null = null;
  private currentCall: { roomId: string; from: string; to: string } | null = null;
  private callbacks: CallCallbacks = {};

  constructor(signalingServerUrl: string) {
    this.peer = new WebRTCPeer();
    this.media = new MediaManager();
    this.signaling = new SignalingClient(signalingServerUrl);

    this.setupPeerCallbacks();
    this.setupSignalingCallbacks();
  }

  /**
   * Configura callbacks do peer
   */
  private setupPeerCallbacks(): void {
    this.peer.onIceCandidate = (candidate) => {
      if (this.currentCall) {
        this.signaling.send({
          type: 'ice-candidate',
          from: this.currentCall.from,
          to: this.currentCall.to,
          roomId: this.currentCall.roomId,
          data: candidate.toJSON(),
        });
      }
    };

    this.peer.onRemoteStream = (stream) => {
      this.callbacks.onRemoteStream?.(stream);
    };

    this.peer.onConnectionStateChange = (state) => {
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        this.endCall();
      }
    };

    this.peer.onIceConnectionStateChange = (state) => {
      if (state === 'failed' || state === 'disconnected') {
        this.endCall();
      }
    };
  }

  /**
   * Configura callbacks de sinalização
   */
  private setupSignalingCallbacks(): void {
    this.signaling.onMessage = async (message) => {
      await this.handleSignalingMessage(message);
    };

    this.signaling.onReconnect = () => {
      // Reconexão será tratada pelo componente
      console.log('Signaling reconnected');
    };
  }

  /**
   * Processa mensagens de sinalização
   */
  private async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'call-request':
          // Atualiza currentCall com roomId da mensagem
          if (!this.currentCall) {
            this.currentCall = {
              roomId: message.roomId,
              from: message.from,
              to: message.to,
            };
          }
          this.handleCallRequest(message);
          break;

        case 'call-accept':
          await this.handleCallAccept(message);
          break;

        case 'call-reject':
          this.handleCallReject();
          break;

        case 'call-end':
          this.handleCallEnd();
          break;

        case 'offer':
          await this.handleOffer(message);
          break;

        case 'answer':
          await this.handleAnswer(message);
          break;

        case 'ice-candidate':
          await this.handleIceCandidate(message);
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Inicia uma chamada
   */
  async startCall(roomId: string, from: string, to: string, callType: CallType): Promise<void> {
    if (this.status !== 'idle') {
      throw new Error('Já existe uma chamada em andamento');
    }

    try {
      // Conecta ao servidor de sinalização
      await this.signaling.connect(from, roomId);

      // Obtém mídia local
      const localStream = await this.media.getUserMedia(callType);

      // Cria peer connection
      const pc = this.peer.createPeerConnection();
      this.peer.addLocalStream(localStream);

      // Cria oferta
      const offer = await this.peer.createOffer();

      // Atualiza estado
      this.status = 'calling';
      this.callType = callType;
      this.currentCall = { roomId, from, to };
      this.callbacks.onStatusChange?.(this.status);

      // Envia solicitação de chamada
      this.signaling.send({
        type: 'call-request',
        from,
        to,
        roomId,
        callType,
      });

      // Envia oferta
      this.signaling.send({
        type: 'offer',
        from,
        to,
        roomId,
        data: offer,
      });
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Aceita uma chamada
   */
  async acceptCall(callType: CallType): Promise<void> {
    if (this.status !== 'ringing' || !this.currentCall) {
      throw new Error('Nenhuma chamada para aceitar');
    }

    try {
      // Obtém mídia local
      const localStream = await this.media.getUserMedia(callType);

      // Cria peer connection
      const pc = this.peer.createPeerConnection();
      this.peer.addLocalStream(localStream);

      // Envia aceitação
      this.signaling.send({
        type: 'call-accept',
        from: this.currentCall.to,
        to: this.currentCall.from,
        roomId: this.currentCall.roomId,
        callType,
      });

      this.status = 'connected';
      this.callType = callType;
      this.callbacks.onStatusChange?.(this.status);
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Recusa uma chamada
   */
  rejectCall(): void {
    if (this.status !== 'ringing' || !this.currentCall) {
      return;
    }

    this.signaling.send({
      type: 'call-reject',
      from: this.currentCall.to,
      to: this.currentCall.from,
      roomId: this.currentCall.roomId,
    });

    this.cleanup();
  }

  /**
   * Encerra uma chamada
   */
  endCall(): void {
    if (this.status === 'idle' || this.status === 'ended') {
      return;
    }

    if (this.currentCall) {
      this.signaling.send({
        type: 'call-end',
        from: this.currentCall.from,
        to: this.currentCall.to,
        roomId: this.currentCall.roomId,
      });
    }

    this.cleanup();
  }

  /**
   * Alterna mute/unmute
   */
  toggleMute(): boolean {
    return this.media.toggleMute();
  }

  /**
   * Alterna vídeo on/off
   */
  toggleVideo(): boolean {
    return this.media.toggleVideo();
  }

  /**
   * Handlers de mensagens de sinalização
   */
  private handleCallRequest(message: SignalingMessage): void {
    if (this.status !== 'idle') {
      // Já existe uma chamada, recusa automaticamente
      this.signaling.send({
        type: 'call-reject',
        from: message.to,
        to: message.from,
        roomId: message.roomId,
      });
      return;
    }

    this.status = 'ringing';
    this.callType = message.callType || 'audio';
    this.currentCall = {
      roomId: message.roomId,
      from: message.from,
      to: message.to,
    };

    this.callbacks.onStatusChange?.(this.status);
    this.callbacks.onCallRequest?.(message.from, this.callType, message.roomId);
  }

  private async handleCallAccept(message: SignalingMessage): Promise<void> {
    if (this.status === 'calling') {
      this.status = 'connected';
      this.callbacks.onStatusChange?.(this.status);
    }
  }

  private handleCallReject(): void {
    this.cleanup();
    this.callbacks.onStatusChange?.('ended');
  }

  private handleCallEnd(): void {
    this.cleanup();
    this.callbacks.onStatusChange?.('ended');
  }

  private async handleOffer(message: SignalingMessage): Promise<void> {
    if (!this.currentCall) {
      // Se não temos uma chamada ativa, criamos uma para receber
      this.currentCall = {
        roomId: message.roomId,
        from: message.from,
        to: message.to,
      };
    }

    // Obtém mídia local se ainda não tiver
    if (!this.media.getLocalStream()) {
      const callType = this.callType || 'audio';
      const localStream = await this.media.getUserMedia(callType);
      const pc = this.peer.createPeerConnection();
      this.peer.addLocalStream(localStream);
    }

    // Define oferta remota e cria resposta
    await this.peer.setRemoteOffer(message.data);
    const answer = await this.peer.createAnswer();

    // Envia resposta
    this.signaling.send({
      type: 'answer',
      from: this.currentCall.to,
      to: this.currentCall.from,
      roomId: this.currentCall.roomId,
      data: answer,
    });

    this.status = 'connected';
    this.callbacks.onStatusChange?.(this.status);
  }

  private async handleAnswer(message: SignalingMessage): Promise<void> {
    await this.peer.setRemoteAnswer(message.data);
    this.status = 'connected';
    this.callbacks.onStatusChange?.(this.status);
  }

  private async handleIceCandidate(message: SignalingMessage): Promise<void> {
    await this.peer.addIceCandidate(message.data);
  }

  /**
   * Limpa recursos
   */
  private cleanup(): void {
    this.peer.close();
    this.media.stopLocalStream();
    this.status = 'idle';
    this.callType = null;
    this.currentCall = null;
    this.callbacks.onStatusChange?.('idle');
  }

  /**
   * Desconecta completamente
   */
  disconnect(): void {
    this.cleanup();
    this.signaling.disconnect();
  }

  /**
   * Define callbacks
   */
  setCallbacks(callbacks: CallCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Getters
   */
  getStatus(): CallStatus {
    return this.status;
  }

  getCallType(): CallType | null {
    return this.callType;
  }

  getLocalStream(): MediaStream | null {
    return this.media.getLocalStream();
  }

  isMuted(): boolean {
    return this.media.isMuted();
  }

  isVideoEnabled(): boolean {
    return this.media.isVideoEnabled();
  }
}

