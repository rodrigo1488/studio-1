/**
 * Gerenciamento de mídia (áudio/vídeo)
 */

import type { CallType } from './types';

export class MediaManager {
  private localStream: MediaStream | null = null;

  /**
   * Obtém stream de mídia do usuário
   */
  async getUserMedia(callType: CallType): Promise<MediaStream> {
    // Para primeiro stream existente
    if (this.localStream) {
      this.stopLocalStream();
    }

    const constraints: MediaStreamConstraints = {
      audio: true,
      video: callType === 'video' ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      } : false,
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('Error getting user media:', error);
      throw new Error('Não foi possível acessar a câmera/microfone. Verifique as permissões.');
    }
  }

  /**
   * Para o stream local
   */
  stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }
  }

  /**
   * Alterna mute/unmute do áudio
   */
  toggleMute(): boolean {
    if (!this.localStream) return false;

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    const isMuted = !audioTracks[0].enabled;
    audioTracks[0].enabled = isMuted;
    return !isMuted; // Retorna novo estado (true = não mudo)
  }

  /**
   * Define estado do mute
   */
  setMute(muted: boolean): void {
    if (!this.localStream) return;

    const audioTracks = this.localStream.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = !muted;
    });
  }

  /**
   * Verifica se está mudo
   */
  isMuted(): boolean {
    if (!this.localStream) return true;

    const audioTracks = this.localStream.getAudioTracks();
    return audioTracks.length === 0 || !audioTracks[0].enabled;
  }

  /**
   * Alterna vídeo on/off
   */
  toggleVideo(): boolean {
    if (!this.localStream) return false;

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return false;

    const isEnabled = !videoTracks[0].enabled;
    videoTracks[0].enabled = isEnabled;
    return isEnabled; // Retorna novo estado
  }

  /**
   * Define estado do vídeo
   */
  setVideoEnabled(enabled: boolean): void {
    if (!this.localStream) return;

    const videoTracks = this.localStream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.enabled = enabled;
    });
  }

  /**
   * Verifica se vídeo está habilitado
   */
  isVideoEnabled(): boolean {
    if (!this.localStream) return false;

    const videoTracks = this.localStream.getVideoTracks();
    return videoTracks.length > 0 && videoTracks[0].enabled;
  }

  /**
   * Retorna o stream local atual
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
}

