/**
 * Servidor WebSocket para sinalização WebRTC
 * 
 * Este servidor deve ser executado separadamente:
 * node src/lib/webrtc/server.js
 * 
 * Ou integrado ao servidor Next.js usando um custom server
 */

import { WebSocketServer, WebSocket } from 'ws';

interface Client {
  ws: WebSocket;
  userId: string;
  roomId: string;
}

export class SignalingServer {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private roomClients: Map<string, Set<string>> = new Map(); // roomId -> Set<userId>

  constructor(port: number = 3001) {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId');
      const roomId = url.searchParams.get('roomId');

      if (!userId || !roomId) {
        ws.close(1008, 'Missing userId or roomId');
        return;
      }

      this.handleConnection(ws, userId, roomId);
    });

    console.log(`Signaling server running on ws://localhost:${port}`);
  }

  private handleConnection(ws: WebSocket, userId: string, roomId: string): void {
    const clientId = `${userId}-${roomId}`;
    const client: Client = { ws, userId, roomId };

    this.clients.set(clientId, client);

    // Adiciona à sala
    if (!this.roomClients.has(roomId)) {
      this.roomClients.set(roomId, new Set());
    }
    this.roomClients.get(roomId)!.add(userId);

    console.log(`Client connected: ${userId} in room ${roomId}`);

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(clientId, message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId, userId, roomId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnection(clientId, userId, roomId);
    });
  }

  private handleMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { type, to, roomId } = message;

    // Encontra o destinatário na mesma sala
    const roomUsers = this.roomClients.get(roomId);
    if (!roomUsers || !roomUsers.has(to)) {
      console.warn(`User ${to} not found in room ${roomId}`);
      return;
    }

    const targetClientId = `${to}-${roomId}`;
    const targetClient = this.clients.get(targetClientId);

    if (!targetClient) {
      console.warn(`Client ${targetClientId} not found`);
      return;
    }

    // Envia mensagem ao destinatário
    if (targetClient.ws.readyState === WebSocket.OPEN) {
      targetClient.ws.send(JSON.stringify(message));
    }
  }

  private handleDisconnection(clientId: string, userId: string, roomId: string): void {
    this.clients.delete(clientId);

    const roomUsers = this.roomClients.get(roomId);
    if (roomUsers) {
      roomUsers.delete(userId);
      if (roomUsers.size === 0) {
        this.roomClients.delete(roomId);
      }
    }

    console.log(`Client disconnected: ${userId} from room ${roomId}`);
  }

  close(): void {
    this.wss.close();
  }
}

// Se executado diretamente
const port = parseInt(process.env.WS_PORT || '3001', 10);
const server = new SignalingServer(port);

process.on('SIGINT', () => {
  console.log('Shutting down signaling server...');
  server.close();
  process.exit(0);
});

