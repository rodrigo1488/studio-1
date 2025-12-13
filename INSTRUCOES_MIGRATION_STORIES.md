# Instruções para Aplicar Migration de Stories

## ⚠️ IMPORTANTE: A tabela `stories` não existe no banco de dados

O erro `Could not find the table 'public.stories'` indica que a migration ainda não foi aplicada.

## Como Aplicar a Migration

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral)
4. Clique em **New Query**
5. Copie e cole o conteúdo do arquivo `supabase/migrations/015_stories.sql`
6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Verifique se as tabelas foram criadas com sucesso

### Opção 2: Via Arquivo SQL Direto

1. Abra o arquivo `APPLY_STORIES_MIGRATION.sql` na raiz do projeto
2. Copie todo o conteúdo
3. Execute no Supabase SQL Editor
4. O script inclui verificações para confirmar que as tabelas foram criadas

### Opção 3: Via Supabase CLI (se configurado)

```bash
# Se você tem Supabase CLI configurado
supabase db push
```

## Verificação

Após executar a migration, verifique se as tabelas foram criadas:

```sql
-- Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('stories', 'story_views');
```

Você deve ver:
- `stories`
- `story_views`

## Após Aplicar a Migration

Após aplicar a migration com sucesso:
1. Recarregue a página do feed
2. O erro 500 na API `/api/stories/list` deve desaparecer
3. A funcionalidade de Stories deve funcionar normalmente

## Notas

- A migration cria as tabelas `stories` e `story_views`
- Configura Row Level Security (RLS) com políticas apropriadas
- Cria índices para melhor performance
- Stories expiram automaticamente após 24 horas

