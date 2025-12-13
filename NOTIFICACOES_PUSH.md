# Sistema de Notificações Push

## ✅ Implementação Completa

Sistema completo de notificações push para notificar usuários quando estão fora do app sobre:
- 📨 **Novas mensagens** em conversas
- 📝 **Novos posts** de usuários que seguem
- ❤️ **Reações em stories** (em breve)

## 📁 Arquivos Criados

### Service Worker
- `public/sw.js` - Service Worker para receber e exibir notificações push

### Componentes
- `src/components/push-notifications/push-notification-setup.tsx` - Componente para ativar notificações

### APIs
- `src/app/api/push/vapid-key/route.ts` - Retorna chave pública VAPID
- `src/app/api/push/subscribe/route.ts` - Registra subscription do usuário
- `src/app/api/push/unsubscribe/route.ts` - Remove subscription do usuário

### Bibliotecas
- `src/lib/push-notifications.ts` - Utilitários para gerenciar push notifications
- `src/lib/push/send-notification.ts` - Envia notificações push
- `src/lib/push/notify-room.ts` - Notifica membros de uma sala
- `src/lib/push/notify-feed.ts` - Notifica seguidores sobre novos posts

### Database
- `supabase/migrations/017_push_subscriptions.sql` - Tabela para armazenar subscriptions

## 🔧 Configuração

### 1. Gerar Chaves VAPID

As chaves VAPID são necessárias para autenticar o servidor com os serviços de push do navegador.

#### Opção 1: Usando web-push (Recomendado)

```bash
npx web-push generate-vapid-keys
```

Isso gerará duas chaves:
- **Public Key**: Use como `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- **Private Key**: Use como `VAPID_PRIVATE_KEY` (NUNCA exponha esta chave)

#### Opção 2: Usando Node.js

```javascript
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
```

### 2. Configurar Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# VAPID Keys para Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=sua_chave_publica_aqui
VAPID_PRIVATE_KEY=sua_chave_privada_aqui
VAPID_EMAIL=mailto:seu-email@exemplo.com
```

**⚠️ IMPORTANTE:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` pode ser pública (começa com `NEXT_PUBLIC_`)
- `VAPID_PRIVATE_KEY` deve ser SECRETA (não começa com `NEXT_PUBLIC_`)
- `VAPID_EMAIL` é usado para identificar o servidor (formato: `mailto:email@exemplo.com`)

### 3. Aplicar Migration

Execute a migration no Supabase:

```sql
-- Execute: supabase/migrations/017_push_subscriptions.sql
```

Ou copie o conteúdo e execute no SQL Editor do Supabase Dashboard.

### 4. Criar Ícone para Notificações

Crie um ícone de 192x192 pixels e salve como:
- `public/icon-192x192.png`

Este ícone será usado nas notificações push.

## 🚀 Como Funciona

### 1. Usuário Ativa Notificações

- O componente `PushNotificationSetup` aparece no canto inferior direito
- Usuário clica em "Ativar Notificações"
- Sistema solicita permissão do navegador
- Service Worker é registrado
- Subscription é criada e salva no banco

### 2. Envio de Notificações

#### Mensagens
Quando uma mensagem é enviada:
1. API `/api/messages/send` envia a mensagem
2. Chama `sendPushNotificationToRoomMembers()`
3. Busca todos os membros da sala (exceto o remetente)
4. Envia notificação push para cada membro

#### Posts
Quando um post é criado:
1. API `/api/feed/create` cria o post
2. Chama `sendPushNotificationToFollowers()`
3. Busca todos os seguidores do autor
4. Envia notificação push para cada seguidor

### 3. Recebimento de Notificações

1. Service Worker recebe o push
2. Exibe notificação no sistema operacional
3. Usuário clica na notificação
4. App abre na URL especificada (ex: `/chat/{roomId}`)

## 📱 Suporte de Navegadores

- ✅ Chrome/Edge (Desktop e Mobile)
- ✅ Firefox (Desktop e Mobile)
- ✅ Safari (iOS 16.4+)
- ❌ Safari (Desktop) - Suporte limitado

## 🔔 Tipos de Notificações

### Mensagens
- **Título**: "Nova mensagem"
- **Corpo**: Texto da mensagem ou tipo de mídia (📷 Imagem, 🎥 Vídeo, etc.)
- **Ação**: Abre a conversa

### Posts
- **Título**: "{Nome do usuário} publicou um novo post"
- **Corpo**: Descrição do post ou "📷 Nova publicação"
- **Ação**: Abre o feed com o post destacado

## 🛠️ Troubleshooting

### Notificações não aparecem

1. **Verifique permissões**:
   - Navegador deve ter permissão para notificações
   - Verifique em Configurações do Site

2. **Verifique Service Worker**:
   - Abra DevTools > Application > Service Workers
   - Deve estar "activated and running"

3. **Verifique Subscription**:
   - Verifique se há registros na tabela `push_subscriptions`
   - Verifique se as chaves VAPID estão corretas

4. **Verifique Console**:
   - Abra DevTools > Console
   - Procure por erros relacionados a push notifications

### Erro: "VAPID keys not configured"

- Verifique se as variáveis de ambiente estão configuradas
- Reinicie o servidor após adicionar as variáveis

### Erro: "Service Worker não suportado"

- Use um navegador moderno
- Certifique-se de que está usando HTTPS (ou localhost para desenvolvimento)

## 📝 Próximos Passos

- [ ] Integrar notificações push com reações em stories
- [ ] Adicionar opções de configuração de notificações por tipo
- [ ] Implementar notificações agrupadas
- [ ] Adicionar som personalizado para notificações
- [ ] Implementar badge de contador de notificações

## 🔒 Segurança

- Chaves VAPID privadas nunca são expostas ao cliente
- Subscriptions são vinculadas ao usuário autenticado
- Notificações só são enviadas para usuários autorizados
- Subscriptions inválidas são automaticamente removidas

## 📚 Recursos

- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web-push library](https://github.com/web-push-libs/web-push)

