# 🔧 Como Resolver Problemas com Notificações Push

## ✅ Checklist Rápido

1. [ ] Migration aplicada no Supabase (`017_push_subscriptions.sql`)
2. [ ] Chaves VAPID configuradas no `.env.local`
3. [ ] Usuário ativou notificações no app
4. [ ] Permissão de notificações concedida no navegador
5. [ ] Service Worker registrado
6. [ ] Subscription salva no banco

## 🔍 Passo 1: Diagnosticar o Problema

Acesse no navegador (faça login primeiro):
```
http://localhost:9002/api/push/test
```

Isso mostrará:
- ✅/❌ Status das chaves VAPID
- Lista de subscriptions do usuário
- Resultado de um teste de notificação

## 🔍 Passo 2: Verificar Logs do Servidor

Quando você envia uma mensagem, verifique o console do servidor. Você deve ver:

```
[Push] Sending notifications to 1 recipient(s) in room abc-123
[Push] Found 1 subscription(s) for user xyz-456
[Push] Sending notification to endpoint: https://fcm.googleapis.com/...
[Push] ✅ Notification sent successfully
```

Se você **NÃO** ver esses logs, significa que:
- As notificações não estão sendo chamadas
- Ou há um erro antes de tentar enviar

## 🔍 Passo 3: Verificar Configuração

### 3.1 Chaves VAPID

Verifique se estão no `.env.local`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=Bk... (começa com B)
VAPID_PRIVATE_KEY=... (string longa)
VAPID_EMAIL=mailto:seu-email@exemplo.com
```

**Gerar chaves se não tiver:**
```bash
node GERAR_VAPID_KEYS.js
```

### 3.2 Migration Aplicada

Execute no Supabase SQL Editor:
```sql
SELECT COUNT(*) FROM push_subscriptions;
```

Se der erro "table does not exist", execute:
- `APPLY_PUSH_SUBSCRIPTIONS_MIGRATION.sql`

### 3.3 Subscriptions no Banco

Verifique se há subscriptions:
```sql
SELECT 
  ps.id,
  u.email,
  u.name,
  ps.endpoint,
  ps.created_at
FROM push_subscriptions ps
JOIN users u ON u.id = ps.user_id;
```

Se estiver vazio, o usuário precisa ativar notificações no app.

## 🔍 Passo 4: Testar Manualmente

1. **Abra duas janelas do navegador** (ou dois navegadores diferentes)
2. **Faça login com usuários diferentes** em cada janela
3. **Ative notificações** em ambos (botão no canto inferior direito)
4. **Feche uma das janelas** (ou minimize)
5. **Envie uma mensagem** da janela aberta para o outro usuário
6. **Verifique se a notificação aparece**

## 🐛 Problemas Comuns e Soluções

### ❌ "VAPID keys not configured"

**Solução:**
1. Gere as chaves: `node GERAR_VAPID_KEYS.js`
2. Adicione ao `.env.local`
3. **Reinicie o servidor** (`npm run dev`)

### ❌ "No subscriptions found for user"

**Solução:**
1. Verifique se o usuário ativou notificações
2. Verifique a tabela `push_subscriptions` no Supabase
3. Tente ativar notificações novamente

### ❌ Notificações não aparecem mesmo com tudo configurado

**Possíveis causas:**

1. **Permissão negada no navegador**
   - Chrome: Configurações > Privacidade > Notificações
   - Verifique se o site está permitido

2. **App está aberto/focado**
   - Alguns navegadores não mostram notificações quando o app está aberto
   - Feche ou minimize a janela

3. **Service Worker não registrado**
   - DevTools > Application > Service Workers
   - Deve estar "activated and running"
   - Se não estiver, tente "Unregister" e recarregue

4. **HTTPS necessário**
   - Push notifications só funcionam em HTTPS (ou localhost)
   - Se estiver em produção, certifique-se de usar HTTPS

5. **Navegador não suporta**
   - Use Chrome, Firefox ou Edge
   - Safari tem suporte limitado

### ❌ Logs mostram "Notification sent successfully" mas não aparece

**Possíveis causas:**

1. **Permissão negada** - Verifique Configurações do Site
2. **App em foco** - Feche/minimize a janela
3. **Notificações silenciadas** - Verifique configurações do sistema
4. **Service Worker com problema** - Tente desregistrar e registrar novamente

## 📊 Verificar Status Completo

Execute esta query no Supabase para ver tudo:

```sql
SELECT 
  u.email,
  u.name,
  COUNT(ps.id) as subscription_count,
  MAX(ps.created_at) as last_subscription
FROM users u
LEFT JOIN push_subscriptions ps ON ps.user_id = u.id
GROUP BY u.id, u.email, u.name
ORDER BY subscription_count DESC;
```

## 🧪 Teste de Notificação

Use o endpoint de teste:
```
GET /api/push/test
```

Isso tentará enviar uma notificação de teste para o usuário logado.

## 📝 Logs Detalhados

O sistema agora registra logs detalhados. Verifique:

- **Console do servidor**: Logs quando tenta enviar notificações
- **Console do navegador**: Logs do Service Worker e subscriptions
- **DevTools > Application > Service Workers**: Status do Service Worker

## ✅ Se Nada Funcionar

1. Verifique todos os logs (servidor e navegador)
2. Execute `/api/push/test` e veja o resultado
3. Verifique a tabela `push_subscriptions` no banco
4. Tente em outro navegador
5. Verifique se as chaves VAPID estão corretas

## 🎯 Próximos Passos

Depois de diagnosticar, me diga:
- O que o `/api/push/test` retorna?
- Quais logs aparecem no servidor?
- Há subscriptions no banco?
- As chaves VAPID estão configuradas?

Com essas informações, posso ajudar a resolver o problema específico!

