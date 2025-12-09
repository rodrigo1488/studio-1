/**
 * Cliente de sinalização WebSocket
 */

import type { SignalingMessage } from './types';

export class SignalingClient {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isManualClose = false;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Conecta ao servidor de sinalização
   */
  connect(userId: string, roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.url}?userId=${userId}&roomId=${roomId}`;
        this.socket = new WebSocket(wsUrl);
        this.isManualClose = false;

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          const errorMessage = 'Não foi possível conectar ao servidor de sinalização. Verifique se o servidor WebSocket está rodando.';
          this.onError?.(new Error(errorMessage) as any);
          if (this.reconnectAttempts === 0) {
            reject(new Error(errorMessage));
          }
        };

        this.socket.onclose = () => {
          console.log('WebSocket closed');
          if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect();
          }
        };

        this.socket.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data);
            this.onMessage?.(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Tenta reconectar
   */
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.onError?.(new Event('max-reconnect-attempts'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    setTimeout(() => {
      if (!this.isManualClose) {
        // Reconexão será feita pelo componente que gerencia o estado
        this.onReconnect?.();
      }
    }, delay);
  }

  /**
   * Reseta contador de tentativas de reconexão
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  /**
   * Envia mensagem de sinalização
   */
  send(message: SignalingMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    message.timestamp = Date.now();
    this.socket.send(JSON.stringify(message));
  }

  /**
   * Desconecta do servidor
   */
  disconnect(): void {
    this.isManualClose = true;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Retorna o estado da conexão
   */
  getReadyState(): number {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }

  // Callbacks
  onMessage?: (message: SignalingMessage) => void;
  onReconnect?: () => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

