# Som Personalizado nas Notificações Push

## ✅ Implementação Completa

O sistema de notificações push agora suporta som personalizado que será tocado quando uma notificação for recebida.

## 📁 Arquivos Modificados

### Service Worker
- `public/sw.js` - Adicionado suporte para som personalizado e envio de mensagem para o cliente tocar o som

### Componentes
- `src/components/notifications/notification-manager.tsx` - Adicionado listener para tocar som quando receber mensagem do Service Worker

### Bibliotecas
- `src/lib/push/send-notification.ts` - Adicionado campo `sound` no payload das notificações

## 🔊 Como Adicionar o Arquivo de Som

### 1. Preparar o Arquivo de Som

Você precisa adicionar um arquivo de áudio no formato **MP3** ou **WAV** na pasta `public/` com o nome `notification-sound.mp3`.

**Recomendações:**
- Duração: Menos de 2 segundos (idealmente 0.5-1 segundo)
- Formato: MP3 ou WAV
- Tamanho: Pequeno (menos de 100KB recomendado)
- Volume: Normalizado (não muito alto nem muito baixo)

### 2. Onde Obter um Som

Você pode:
- Criar seu próprio som usando ferramentas como Audacity
- Baixar sons gratuitos de sites como:
  - [Freesound.org](https://freesound.org)
  - [Zapsplat](https://www.zapsplat.com)
  - [Mixkit](https://mixkit.co/free-sound-effects/notification/)

**Exemplo de busca:** "notification sound", "message alert", "chat notification"

### 3. Adicionar o Arquivo

1. Coloque o arquivo de som em `public/notification-sound.mp3`
2. Certifique-se de que o arquivo está acessível publicamente
3. O sistema automaticamente usará este som nas notificações

## 🎵 Como Funciona

1. **Quando uma notificação push é recebida:**
   - O Service Worker recebe a notificação
   - Adiciona o campo `sound` no payload
   - Envia uma mensagem para todos os clientes abertos

2. **No cliente (navegador):**
   - O `NotificationManager` escuta mensagens do Service Worker
   - Quando recebe a mensagem `PLAY_NOTIFICATION_SOUND`, toca o som usando a API de áudio do navegador

3. **Compatibilidade:**
   - Funciona em todos os navegadores modernos que suportam Service Workers
   - O som é tocado mesmo quando o app está em background
   - Se o arquivo de som não existir, o sistema não quebra (apenas não toca som)

## 🔧 Personalização

### Alterar o Som

Para usar um som diferente:
1. Substitua o arquivo `public/notification-sound.mp3` pelo seu arquivo
2. Ou altere a constante `NOTIFICATION_SOUND` em `public/sw.js`

### Desabilitar o Som

Para desabilitar o som temporariamente, você pode:
1. Remover o arquivo `public/notification-sound.mp3`
2. Ou comentar a lógica de tocar som no `NotificationManager`

## 📝 Notas Técnicas

- O Service Worker não pode tocar áudio diretamente, por isso enviamos uma mensagem para o cliente
- O volume do som é configurado para 70% (pode ser ajustado em `notification-manager.tsx`)
- O som é tocado de forma assíncrona e não bloqueia a exibição da notificação
- Se houver erro ao tocar o som, ele é logado mas não interrompe o funcionamento

## 🧪 Testando

1. Certifique-se de que o arquivo `public/notification-sound.mp3` existe
2. Ative as notificações push no app
3. Envie uma mensagem de teste de outro usuário
4. O som deve ser tocado quando a notificação aparecer

## ⚠️ Troubleshooting

**O som não está tocando:**
- Verifique se o arquivo `public/notification-sound.mp3` existe
- Verifique o console do navegador para erros
- Certifique-se de que o Service Worker está registrado
- Verifique se o navegador permite reprodução de áudio (alguns navegadores bloqueiam áudio autoplay)

**O som está muito alto/baixo:**
- Ajuste o volume no código: `audio.volume = 0.7;` em `notification-manager.tsx`
- Ou normalize o arquivo de áudio antes de adicionar

