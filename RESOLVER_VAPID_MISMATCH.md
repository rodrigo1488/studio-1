# 🔧 Resolver Erro: VAPID Credentials Mismatch

## ❌ Erro: "the VAPID credentials in the authorization header do not correspond to the credentials used to create the subscriptions"

Este erro ocorre quando:
- As subscriptions foram criadas com chaves VAPID antigas
- Você regenerou/alterou as chaves VAPID
- As subscriptions antigas ainda estão no banco de dados

## ✅ Solução

### Opção 1: Limpar Subscriptions Antigas (Recomendado)

1. **Execute o script SQL** no Supabase:
   - Abra `LIMPAR_SUBSCRIPTIONS_ANTIGAS.sql`
   - Copie e cole no SQL Editor do Supabase
   - Execute a query para ver quantas subscriptions existem
   - Descomente a linha `DELETE FROM push_subscriptions;` e execute

2. **Peça aos usuários para ativarem notificações novamente**:
   - Eles precisarão clicar em "Ativar Notificações" novamente
   - As novas subscriptions serão criadas com as novas chaves VAPID

### Opção 2: O Código Remove Automaticamente (Já Implementado)

O código agora detecta automaticamente subscriptions inválidas (erro 403) e as remove do banco. Isso significa:

- ✅ Subscriptions inválidas são removidas automaticamente
- ✅ Usuários precisarão ativar notificações novamente quando tentarem usar
- ✅ Não é necessário limpar manualmente (mas pode ser mais rápido)

### Opção 3: Manter Ambas as Chaves (Não Recomendado)

Se você quiser manter as subscriptions antigas funcionando:
- Não altere as chaves VAPID
- Use as mesmas chaves que foram usadas para criar as subscriptions

## 🔍 Verificar Subscriptions

Execute no Supabase SQL Editor:

```sql
SELECT 
  u.email,
  u.name,
  ps.endpoint,
  ps.created_at
FROM push_subscriptions ps
JOIN users u ON u.id = ps.user_id
ORDER BY ps.created_at DESC;
```

## 📝 Passo a Passo Completo

1. **Regenerar chaves VAPID** (se ainda não fez):
   ```bash
   node GERAR_VAPID_KEYS.js
   ```

2. **Atualizar variáveis de ambiente no Vercel**:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = nova chave pública
   - `VAPID_PRIVATE_KEY` = nova chave privada
   - `VAPID_EMAIL` = `mailto:gomesrodrigo528@gmail.com`

3. **Limpar subscriptions antigas**:
   - Execute `LIMPAR_SUBSCRIPTIONS_ANTIGAS.sql` no Supabase
   - OU deixe o código remover automaticamente (mais lento)

4. **Fazer novo deploy** no Vercel

5. **Usuários ativam notificações novamente**:
   - Cada usuário precisa clicar em "Ativar Notificações" novamente
   - As novas subscriptions serão criadas com as novas chaves

## ⚠️ Importante

- **Não é possível** usar subscriptions criadas com chaves antigas com chaves novas
- **Não é possível** usar subscriptions criadas com chaves novas com chaves antigas
- **Sempre** limpe as subscriptions antigas quando regenerar as chaves
- **Avise os usuários** que precisarão ativar notificações novamente

## 🧪 Testar

Após limpar as subscriptions e fazer deploy:

1. Ative notificações no app
2. Envie uma mensagem de teste
3. Verifique os logs - não deve mais aparecer erro 403
4. A notificação deve aparecer corretamente

## 📊 Monitoramento

O código agora registra quando remove subscriptions inválidas:
```
[Push] Marking subscription for removal (403): https://fcm.googleapis.com/...
[Push] Removed 2 invalid subscription(s)
```

Verifique os logs do servidor para acompanhar a limpeza automática.

