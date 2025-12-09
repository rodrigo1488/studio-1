# Documentação WebRTC - Sistema de Chamadas

## Visão Geral

Este sistema implementa chamadas de áudio e vídeo em tempo real usando WebRTC com sinalização via WebSocket. A arquitetura é modular e permite fácil integração em qualquer aplicação.

## Arquitetura

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Cliente A     │◄───────►│  Servidor WS     │◄───────►│   Cliente B     │
│                 │         │  (Sinalização)   │         │                 │
│  WebRTCManager  │         │                  │         │  WebRTCManager  │
│  - Peer         │         │  - Roteamento    │         │  - Peer         │
│  - Media        │         │  - Mensagens     │         │  - Media        │
│  - Signaling    │         │                  │         │  - Signaling    │
└─────────────────┘         └──────────────────┘         └─────────────────┘
         │                                                         │
         │                    P2P (WebRTC)                        │
         └─────────────────────────────────────────────────────────┘
```

## Estrutura de Módulos

```
src/lib/webrtc/
├── types.ts           # Tipos e interfaces
├── peer.ts            # Gerenciamento de RTCPeerConnection
├── media.ts           # Captura e controle de mídia
├── signaling.ts       # Cliente WebSocket de sinalização
├── webrtc-manager.ts # Orquestrador principal
└── server.ts         # Servidor WebSocket (standalone)

src/components/webrtc/
├── call-ui.tsx       # Interface de chamada
└── call-button.tsx   # Botão para iniciar chamadas
```

## Fluxo de Chamada

### 1. Iniciar Chamada (Caller)

```
1. Usuário clica em "Iniciar chamada"
2. WebRTCManager.startCall()
   ├─ Conecta ao WebSocket
   ├─ Obtém mídia local (getUserMedia)
   ├─ Cria RTCPeerConnection
   ├─ Adiciona stream local
   ├─ Cria oferta (createOffer)
   ├─ Envia call-request
   └─ Envia offer
3. Aguarda resposta
```

### 2. Receber Chamada (Callee)

```
1. Recebe call-request via WebSocket
2. Exibe UI de chamada recebida
3. Usuário aceita/recusa
4. Se aceita:
   ├─ Obtém mídia local
   ├─ Cria RTCPeerConnection
   ├─ Adiciona stream local
   ├─ Define oferta remota (setRemoteOffer)
   ├─ Cria resposta (createAnswer)
   ├─ Envia call-accept
   └─ Envia answer
```

### 3. Troca de ICE Candidates

```
1. Cada peer gera ICE candidates
2. Envia via WebSocket (ice-candidate)
3. Peer remoto adiciona candidate (addIceCandidate)
4. Conexão P2P estabelecida
```

### 4. Encerrar Chamada

```
1. Qualquer peer envia call-end
2. Limpa recursos:
   ├─ Fecha RTCPeerConnection
   ├─ Para streams locais
   ├─ Desconecta WebSocket
   └─ Reseta estado
```

## Tipos de Mensagens de Sinalização

### call-request
```json
{
  "type": "call-request",
  "from": "user-id-1",
  "to": "user-id-2",
  "roomId": "room-id",
  "callType": "audio" | "video"
}
```

### call-accept
```json
{
  "type": "call-accept",
  "from": "user-id-2",
  "to": "user-id-1",
  "roomId": "room-id",
  "callType": "audio" | "video"
}
```

### call-reject
```json
{
  "type": "call-reject",
  "from": "user-id-2",
  "to": "user-id-1",
  "roomId": "room-id"
}
```

### offer
```json
{
  "type": "offer",
  "from": "user-id-1",
  "to": "user-id-2",
  "roomId": "room-id",
  "data": {
    "type": "offer",
    "sdp": "..."
  }
}
```

### answer
```json
{
  "type": "answer",
  "from": "user-id-2",
  "to": "user-id-1",
  "roomId": "room-id",
  "data": {
    "type": "answer",
    "sdp": "..."
  }
}
```

### ice-candidate
```json
{
  "type": "ice-candidate",
  "from": "user-id-1",
  "to": "user-id-2",
  "roomId": "room-id",
  "data": {
    "candidate": "...",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  }
}
```

### call-end
```json
{
  "type": "call-end",
  "from": "user-id-1",
  "to": "user-id-2",
  "roomId": "room-id"
}
```

## Configuração

### Variáveis de Ambiente

```env
# URL do servidor WebSocket
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Porta do servidor WebSocket (opcional, padrão: 3001)
WS_PORT=3001
```

### Servidor WebSocket

O servidor WebSocket deve ser executado separadamente:

```bash
# Desenvolvimento
npm run ws:dev

# Produção
npm run ws:server
```

Ou usando tsx diretamente:

```bash
npx tsx src/lib/webrtc/server.ts
```

## Integração

### 1. Adicionar Botão de Chamada

```tsx
import { CallButton } from '@/components/webrtc/call-button';

<CallButton room={room} currentUser={currentUser} />
```

### 2. Usar WebRTCManager Diretamente

```tsx
import { WebRTCManager } from '@/lib/webrtc/webrtc-manager';

const manager = new WebRTCManager('ws://localhost:3001');

manager.setCallbacks({
  onStatusChange: (status) => console.log('Status:', status),
  onRemoteStream: (stream) => {
    // Atualizar vídeo remoto
  },
  onCallRequest: (from, callType) => {
    // Exibir UI de chamada recebida
  },
  onError: (error) => console.error(error),
});

// Iniciar chamada
await manager.startCall(roomId, fromUserId, toUserId, 'video');

// Aceitar chamada
await manager.acceptCall('video');

// Encerrar chamada
manager.endCall();
```

## Estados da Chamada

- `idle`: Sem chamada ativa
- `calling`: Chamando outro usuário
- `ringing`: Recebendo chamada
- `connected`: Chamada estabelecida
- `ended`: Chamada encerrada
- `rejected`: Chamada recusada

## Recursos

### Controles de Mídia

```tsx
// Mute/Unmute
const isMuted = manager.toggleMute();

// Ligar/Desligar vídeo
const isVideoEnabled = manager.toggleVideo();

// Verificar estados
const isMuted = manager.isMuted();
const isVideoEnabled = manager.isVideoEnabled();
```

## Reconexão Automática

O sistema implementa reconexão automática do WebSocket:

- Máximo de 5 tentativas
- Backoff exponencial (1s, 2s, 4s, 8s, 16s)
- Notifica via callback `onReconnect`
- Reseta contador após conexão bem-sucedida

## Detecção de Desconexão

- Monitora `iceConnectionState` e `connectionState`
- Encerra chamada automaticamente em caso de falha
- Limpa recursos e notifica usuário

## STUN Servers

Por padrão, usa servidores STUN públicos do Google:

```typescript
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}
```

Para produção, considere usar TURN servers para melhor compatibilidade com NATs complexos.

## Troubleshooting

### Chamada não conecta

1. Verifique se o servidor WebSocket está rodando
2. Verifique permissões de câmera/microfone
3. Verifique console do navegador para erros
4. Teste com STUN/TURN servers diferentes

### Vídeo não aparece

1. Verifique se `getUserMedia` foi bem-sucedido
2. Verifique se o stream está sendo adicionado ao peer
3. Verifique se o elemento `<video>` tem `autoPlay` e `playsInline`

### Áudio não funciona

1. Verifique permissões do microfone
2. Verifique se o track de áudio está habilitado
3. Verifique volume do sistema

## Próximos Passos

- [ ] Suporte para chamadas em grupo
- [ ] Gravação de chamadas
- [ ] Compartilhamento de tela
- [ ] Chat durante chamada
- [ ] Indicadores de qualidade de conexão
- [ ] TURN servers para produção

