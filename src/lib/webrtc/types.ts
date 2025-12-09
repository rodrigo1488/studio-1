/**
 * Tipos e interfaces para WebRTC
 */

export type CallType = 'audio' | 'video';

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-accept' | 'call-reject' | 'call-end';
  from: string; // userId
  to: string; // userId
  roomId: string;
  callType?: CallType;
  data?: any; // offer, answer, ice candidate, etc.
  timestamp?: number;
}

export interface CallState {
  status: CallStatus;
  callType: CallType | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  signalingSocket: WebSocket | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  currentCall: {
    roomId: string;
    from: string;
    to: string;
  } | null;
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  signalingServerUrl: string;
}

