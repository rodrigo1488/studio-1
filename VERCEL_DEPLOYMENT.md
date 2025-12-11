# Configuração para Deploy na Vercel

## Variáveis de Ambiente Necessárias

Certifique-se de configurar todas as seguintes variáveis de ambiente no painel da Vercel:

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` - URL do seu projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anônima do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço do Supabase (IMPORTANTE para uploads)

### Storage
- `NEXT_PUBLIC_STORAGE_BUCKET` - Nome do bucket (padrão: `media`)
- `NEXT_PUBLIC_MAX_FILE_SIZE` - Tamanho máximo de arquivo em bytes (padrão: 10485760 = 10MB)

### App
- `NEXT_PUBLIC_APP_URL` - URL da sua aplicação (ex: `https://seu-app.vercel.app`)

## Configuração do Bucket no Supabase

1. Acesse o Supabase Dashboard
2. Vá em **Storage**
3. Crie um bucket chamado `media` (ou o nome que você configurou em `NEXT_PUBLIC_STORAGE_BUCKET`)
4. Configure o bucket como **Public**
5. Configure as políticas RLS conforme necessário

## Limites da Vercel

### Planos Hobby (Gratuito)
- **Timeout de API Routes**: 10 segundos
- **Tamanho máximo do body**: 4.5 MB

### Planos Pro
- **Timeout de API Routes**: 60 segundos (configurado no código)
- **Tamanho máximo do body**: 4.5 MB

### Recomendações
- Limite o número de arquivos por post (máximo 5-10)
- Limite o tamanho de cada arquivo (máximo 5MB por arquivo)
- Para uploads maiores, considere usar upload direto do cliente para Supabase Storage

## Troubleshooting

### Erro: "Supabase admin client not initialized"
- Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada na Vercel
- Verifique se não há espaços extras na variável

### Erro: "Bucket not found"
- Crie o bucket no Supabase Dashboard
- Verifique se o nome do bucket corresponde a `NEXT_PUBLIC_STORAGE_BUCKET`

### Erro: "Timeout"
- Reduza o número de arquivos
- Reduza o tamanho dos arquivos
- Considere fazer uploads sequenciais ao invés de paralelos

### Erro: "Failed to upload file"
- Verifique as políticas RLS do bucket
- Verifique se o bucket está configurado como público
- Verifique os logs da Vercel para mais detalhes

