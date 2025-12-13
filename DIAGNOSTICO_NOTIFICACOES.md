# 🔍 Diagnóstico de Notificações Push

## Como Diagnosticar Problemas

### 1. Verificar Configuração

Acesse no navegador:
```
http://localhost:9002/api/push/test
```

Ou em produção:
```
https://seu-dominio.com/api/push/test
```

Isso retornará um JSON com:
- Status das chaves VAPID
- Subscriptions do usuário
- Resultado de um teste de notificação

### 2. Verificar no Console do Servidor

Quando uma mensagem é enviada, você deve ver logs como:
```
[Push] Sending notifications to 2 recipient(s) in room abc-123
[Push] Found 1 subscription(s) for user xyz-456
[Push] Sending notification to endpoint: https://fcm.googleapis.com/...
[Push] ✅ Notification sent successfully
```

### 3. Verificar no Console do Navegador

No DevTools > Console, verifique:
- Service Worker registrado
- Subscription criada
- Erros relacionados a push

### 4. Checklist de Problemas Comuns

#### ❌ "VAPID keys not configured"
**Solução**: Configure as variáveis de ambiente:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:seu-email@exemplo.com
```

#### ❌ "No subscriptions found for user"
**Solução**: 
1. Verifique se o usuário ativou notificações
2. Verifique a tabela `push_subscriptions` no Supabase
3. Tente ativar notificações novamente

#### ❌ "Table push_subscriptions does not exist"
**Solução**: Execute a migration `APPLY_PUSH_SUBSCRIPTIONS_MIGRATION.sql`

#### ❌ Notificações não aparecem mesmo com tudo configurado
**Possíveis causas**:
1. **Permissão negada**: Verifique Configurações do Site > Notificações
2. **Service Worker não registrado**: Verifique em DevTools > Application > Service Workers
3. **Navegador não suporta**: Use Chrome, Firefox ou Edge
4. **HTTPS necessário**: Push notifications só funcionam em HTTPS (ou localhost)
5. **App em foco**: Alguns navegadores não mostram notificações quando o app está aberto

### 5. Testar Manualmente

1. Abra o app em duas janelas diferentes (ou dois navegadores)
2. Faça login com usuários diferentes
3. Ative notificações em ambos
4. Envie uma mensagem de um para o outro
5. Verifique se a notificação aparece

### 6. Verificar Service Worker

1. Abra DevTools > Application > Service Workers
2. Deve estar "activated and running"
3. Se não estiver, tente "Unregister" e recarregue a página

### 7. Verificar Permissões

1. Chrome: Configurações > Privacidade e segurança > Notificações
2. Firefox: Configurações > Privacidade e segurança > Permissões > Notificações
3. Verifique se o site está permitido

### 8. Logs Detalhados

O sistema agora registra logs detalhados:
- Quando tenta enviar notificações
- Quantas subscriptions foram encontradas
- Sucessos e falhas
- Erros específicos

Verifique o console do servidor para ver esses logs.

## 🐛 Debug Avançado

### Verificar Subscription no Banco

Execute no Supabase SQL Editor:
```sql
SELECT 
  ps.id,
  ps.user_id,
  u.email,
  u.name,
  ps.endpoint,
  ps.created_at
FROM push_subscriptions ps
JOIN users u ON u.id = ps.user_id
ORDER BY ps.created_at DESC;
```

### Testar Envio Manual

Crie um endpoint de teste ou use o `/api/push/test` para enviar uma notificação de teste.

### Verificar Chaves VAPID

As chaves devem estar no formato correto:
- Public Key: Começa com `B` e é base64 URL-safe
- Private Key: Começa com caracteres aleatórios e é base64 URL-safe

## 📝 Logs Esperados

### Quando uma mensagem é enviada:
```
[Push] Sending notifications to 1 recipient(s) in room abc-123
[Push] Found 1 subscription(s) for user xyz-456
[Push] Sending notification to endpoint: https://fcm.googleapis.com/...
[Push] ✅ Notification sent successfully
[Push] Room notifications: 1 success, 0 failures
```

### Quando não há subscriptions:
```
[Push] Sending notifications to 1 recipient(s) in room abc-123
[Push] ⚠️ No subscriptions found for user xyz-456
[Push] Room notifications: 0 success, 0 failures
```

### Quando há erro:
```
[Push] ❌ Error sending to https://...: Invalid subscription
[Push] Room notifications: 0 success, 1 failures
```

