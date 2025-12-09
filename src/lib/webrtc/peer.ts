/**
 * Gerenciamento de RTCPeerConnection
 */

import type { CallType, WebRTCConfig } from './types';

const DEFAULT_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  signalingServerUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
};

export class WebRTCPeer {
  private peerConnection: RTCPeerConnection | null = null;
  private config: WebRTCConfig;

  constructor(config?: Partial<WebRTCConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Cria uma nova RTCPeerConnection
   */
  createPeerConnection(): RTCPeerConnection {
    if (this.peerConnection) {
      this.close();
    }

    this.peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    });

    // Event listeners
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidate?.(event.candidate);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      this.onIceConnectionStateChange?.(state || 'closed');
    };

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onRemoteStream?.(event.streams[0]);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      this.onConnectionStateChange?.(state || 'closed');
    };

    return this.peerConnection;
  }

  /**
   * Adiciona stream local à conexão
   */
  addLocalStream(stream: MediaStream): void {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    stream.getTracks().forEach((track) => {
      this.peerConnection!.addTrack(track, stream);
    });
  }

  /**
   * Remove stream local da conexão
   */
  removeLocalStream(): void {
    if (!this.peerConnection) return;

    const senders = this.peerConnection.getSenders();
    senders.forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
        this.peerConnection!.removeTrack(sender);
      }
    });
  }

  /**
   * Cria e retorna uma oferta SDP
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Cria e retorna uma resposta SDP
   */
  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  /**
   * Define a oferta remota
   */
  async setRemoteOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(offer);
  }

  /**
   * Define a resposta remota
   */
  async setRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(answer);
  }

  /**
   * Adiciona um ICE candidate
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.addIceCandidate(candidate);
  }

  /**
   * Fecha a conexão
   */
  close(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  /**
   * Retorna a conexão atual
   */
  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  // Callbacks
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

