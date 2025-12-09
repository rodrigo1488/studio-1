# WebRTC - Guia de Início Rápido

## Instalação

As dependências já estão instaladas. Se necessário:

```bash
npm install ws @types/ws tsx --save-dev
```

## Configuração

1. Adicione a variável de ambiente no `.env.local`:

```env
NEXT_PUBLIC_WS_URL=ws://localhost:3001
WS_PORT=3001
```

## Executar

### 1. Iniciar Servidor WebSocket

Em um terminal separado:

```bash
npm run ws:server
```

Ou para desenvolvimento com watch:

```bash
npm run ws:dev
```

### 2. Iniciar Aplicação Next.js

```bash
npm run dev
```

## Uso

1. Faça login na aplicação
2. Entre em uma conversa direta (2 membros)
3. Clique no botão de telefone no header do chat
4. Escolha "Chamada de áudio" ou "Chamada de vídeo"
5. O outro usuário receberá uma notificação de chamada
6. Após aceitar, a chamada será estabelecida

## Funcionalidades

- ✅ Chamadas de áudio
- ✅ Chamadas de vídeo
- ✅ Aceitar/Recusar chamadas
- ✅ Mute/Unmute
- ✅ Ligar/Desligar câmera
- ✅ Detecção de desconexão
- ✅ Reconexão automática do WebSocket
- ✅ Interface moderna e responsiva

## Troubleshooting

### Servidor WebSocket não inicia

- Verifique se a porta 3001 está disponível
- Verifique se `tsx` está instalado: `npm install tsx --save-dev`

### Chamada não conecta

- Verifique se o servidor WebSocket está rodando
- Verifique permissões de câmera/microfone no navegador
- Abra o console do navegador para ver erros

### Vídeo não aparece

- Verifique se permitiu acesso à câmera
- Verifique se o navegador suporta WebRTC
- Teste em navegadores diferentes (Chrome, Firefox, Safari)

## Documentação Completa

Veja `docs/webrtc.md` para documentação técnica completa.

