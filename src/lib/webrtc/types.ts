export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export interface SignalingMessage {
    type: 'offer' | 'answer' | 'candidate' | 'call-request' | 'call-accepted' | 'call-rejected' | 'end-call' | 'user-joined';
    payload?: any;
    from?: string;
    to?: string;
    roomId?: string;
    callType?: CallType;
}

export interface WebRTCManagerCallbacks {
    onStatusChange: (status: CallStatus) => void;
    onRemoteStream: (stream: MediaStream) => void;
    onCallRequest: (from: string, type: CallType, roomId?: string) => void;
    onError: (error: Error) => void;
}
