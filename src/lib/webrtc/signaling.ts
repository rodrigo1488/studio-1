import { SignalingMessage } from './types';

export class SignalingClient {
    private ws: WebSocket | null = null;
    private url: string;
    private userId: string;
    private roomId: string;
    private onMessage: (msg: SignalingMessage) => void;
    private onConnect?: () => void;
    private onDisconnect?: () => void;

    constructor(
        url: string,
        userId: string,
        roomId: string,
        onMessage: (msg: SignalingMessage) => void,
        onConnect?: () => void,
        onDisconnect?: () => void
    ) {
        this.url = url;
        this.userId = userId;
        this.roomId = roomId;
        this.onMessage = onMessage;
        this.onConnect = onConnect;
        this.onDisconnect = onDisconnect;
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        // Conecta passando userId e roomId na query string, conforme server.ts espera
        const fullUrl = `${this.url}?userId=${this.userId}&roomId=${this.roomId}`;

        try {
            this.ws = new WebSocket(fullUrl);

            this.ws.onopen = () => {
                console.log('Signaling connected');
                this.onConnect?.();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.onMessage(message);
                } catch (error) {
                    console.error('Error parsing signaling message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('Signaling disconnected');
                this.onDisconnect?.();
                this.ws = null;
            };

            this.ws.onerror = (error) => {
                console.error('Signaling error:', error);
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
        }
    }

    send(message: SignalingMessage) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('Cannot send message, socket not open');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
