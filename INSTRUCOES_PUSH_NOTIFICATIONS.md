# 🔔 Instruções para Configurar Notificações Push

## ⚠️ Erro: "Tabela de notificações não encontrada"

Se você está recebendo este erro, significa que a tabela `push_subscriptions` ainda não foi criada no banco de dados.

## 📋 Passo a Passo

### 1. Aplicar Migration no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Abra o arquivo `APPLY_PUSH_SUBSCRIPTIONS_MIGRATION.sql`
4. Copie todo o conteúdo do arquivo
5. Cole no SQL Editor
6. Clique em **Run** (ou pressione `Ctrl+Enter`)

### 2. Verificar se a Tabela foi Criada

Execute esta query no SQL Editor:

```sql
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;
```

Você deve ver as colunas:
- `id` (uuid)
- `user_id` (uuid)
- `endpoint` (text)
- `p256dh_key` (text)
- `auth_key` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 3. Gerar Chaves VAPID

Execute no terminal:

```bash
node GERAR_VAPID_KEYS.js
```

Ou:

```bash
npx web-push generate-vapid-keys
```

### 4. Configurar Variáveis de Ambiente

Adicione ao `.env.local`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=sua_chave_publica_aqui
VAPID_PRIVATE_KEY=sua_chave_privada_aqui
VAPID_EMAIL=mailto:seu-email@exemplo.com
```

### 5. Reiniciar o Servidor

Após adicionar as variáveis de ambiente:

```bash
npm run dev
```

### 6. Testar Notificações

1. Acesse o app no navegador
2. Clique no botão "Ativar Notificações" no canto inferior direito
3. Permita notificações quando solicitado
4. Deve aparecer "Notificações ativadas!"

## 🔍 Troubleshooting

### Erro: "Table push_subscriptions does not exist"

**Solução**: Execute a migration `APPLY_PUSH_SUBSCRIPTIONS_MIGRATION.sql` no Supabase Dashboard.

### Erro: "VAPID keys not configured"

**Solução**: 
1. Gere as chaves VAPID
2. Adicione ao `.env.local`
3. Reinicie o servidor

### Erro: "Service Worker não suportado"

**Solução**: 
- Use um navegador moderno (Chrome, Firefox, Edge)
- Certifique-se de estar usando HTTPS (ou localhost)

### Notificações não aparecem

1. Verifique permissões do navegador:
   - Chrome: Configurações > Privacidade e segurança > Notificações
   - Firefox: Configurações > Privacidade e segurança > Permissões

2. Verifique Service Worker:
   - DevTools > Application > Service Workers
   - Deve estar "activated and running"

3. Verifique Console:
   - DevTools > Console
   - Procure por erros relacionados a push notifications

## ✅ Checklist

- [ ] Migration aplicada no Supabase
- [ ] Tabela `push_subscriptions` existe
- [ ] Chaves VAPID geradas
- [ ] Variáveis de ambiente configuradas
- [ ] Servidor reiniciado
- [ ] Permissão de notificações concedida
- [ ] Service Worker registrado
- [ ] Subscription salva no banco

## 📚 Arquivos Importantes

- `APPLY_PUSH_SUBSCRIPTIONS_MIGRATION.sql` - Script SQL para criar a tabela
- `GERAR_VAPID_KEYS.js` - Script para gerar chaves VAPID
- `NOTIFICACOES_PUSH.md` - Documentação completa do sistema

