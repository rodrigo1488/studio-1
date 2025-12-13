# Som e Vibração Personalizados nas Notificações Push

## ✅ Implementação Completa

O sistema de notificações push agora suporta:
- 🔊 **Som personalizado** que será tocado quando uma notificação for recebida
- 📳 **Vibração** em dispositivos móveis quando uma notificação for recebida

## 📁 Arquivos Modificados

### Service Worker
- `public/sw.js` - Adicionado suporte para som personalizado, vibração e envio de mensagem para o cliente

### Componentes
- `src/components/notifications/notification-manager.tsx` - Adicionado listener para tocar som e vibrar quando receber mensagem do Service Worker

### Bibliotecas
- `src/lib/push/send-notification.ts` - Adicionado campo `sound` no payload das notificações
- `src/lib/utils/vibration.ts` - Utilitários para gerenciar vibração do dispositivo

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

### Som

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

### Vibração

1. **Quando uma notificação push é recebida:**
   - O Service Worker verifica se o dispositivo suporta vibração
   - Se suportar, vibra com o padrão: `[200ms, pausa 100ms, vibrar 200ms]`
   - Também envia uma mensagem para o cliente vibrar

2. **No cliente (navegador):**
   - O `NotificationManager` escuta mensagens do Service Worker
   - Quando recebe a mensagem com `vibrate: true`, vibra usando a API de vibração do navegador
   - Também vibra quando mostra notificações in-app (quando o usuário está com o app aberto)

3. **Compatibilidade:**
   - Funciona em dispositivos móveis (Android, iOS via Safari)
   - Funciona em navegadores desktop que suportam a API de vibração (Chrome, Edge)
   - Se o dispositivo não suportar vibração, o sistema não quebra (apenas não vibra)

## 📳 Padrões de Vibração

O sistema usa padrões de vibração personalizados:

- **Padrão padrão**: `[200, 100, 200]` - Vibra 200ms, pausa 100ms, vibra 200ms (dupla vibração)
- **Padrões disponíveis** em `src/lib/utils/vibration.ts`:
  - `SHORT`: `[100]` - Vibração curta única
  - `MEDIUM`: `[200]` - Vibração média única
  - `LONG`: `[400]` - Vibração longa única
  - `DOUBLE`: `[200, 100, 200]` - Vibração dupla (padrão)
  - `TRIPLE`: `[200, 100, 200, 100, 200]` - Vibração tripla
  - `ALERT`: `[400, 200, 400]` - Padrão de alerta
  - `HEARTBEAT`: `[100, 50, 100, 50, 200]` - Padrão de batida cardíaca

## 🔧 Personalização

### Alterar o Som

Para usar um som diferente:
1. Substitua o arquivo `public/notification-sound.mp3` pelo seu arquivo
2. Ou altere a constante `NOTIFICATION_SOUND` em `public/sw.js`

### Alterar o Padrão de Vibração

Para usar um padrão de vibração diferente:
1. Edite `public/sw.js` e altere o array `vibrationPattern`:
   ```javascript
   const vibrationPattern = [200, 100, 200]; // Padrão atual
   ```
2. Ou use os padrões pré-definidos em `src/lib/utils/vibration.ts`:
   ```typescript
   import { vibratePattern, VibrationPatterns } from '@/lib/utils/vibration';
   vibratePattern('TRIPLE'); // Usa o padrão triplo
   ```

### Desabilitar o Som

Para desabilitar o som temporariamente, você pode:
1. Remover o arquivo `public/notification-sound.mp3`
2. Ou comentar a lógica de tocar som no `NotificationManager`

### Desabilitar a Vibração

Para desabilitar a vibração temporariamente:
1. Comente a lógica de vibração no Service Worker (`public/sw.js`)
2. Ou comente a lógica de vibração no `NotificationManager`

## 📝 Notas Técnicas

### Som
- O Service Worker não pode tocar áudio diretamente, por isso enviamos uma mensagem para o cliente
- O volume do som é configurado para 70% (pode ser ajustado em `notification-manager.tsx`)
- O som é tocado de forma assíncrona e não bloqueia a exibição da notificação
- Se houver erro ao tocar o som, ele é logado mas não interrompe o funcionamento

### Vibração
- A API de vibração (`navigator.vibrate()`) está disponível no Service Worker e no cliente
- O Service Worker vibra diretamente quando recebe a notificação push
- O cliente também vibra quando recebe mensagem do Service Worker ou quando mostra notificação in-app
- A vibração funciona mesmo quando o app está em background (via Service Worker)
- Se o dispositivo não suportar vibração, o sistema não quebra (apenas não vibra)

## 🧪 Testando

### Testar Som
1. Certifique-se de que o arquivo `public/notification-sound.mp3` existe
2. Ative as notificações push no app
3. Envie uma mensagem de teste de outro usuário
4. O som deve ser tocado quando a notificação aparecer

### Testar Vibração
1. Use um dispositivo móvel ou navegador que suporte vibração
2. Ative as notificações push no app
3. Envie uma mensagem de teste de outro usuário
4. O dispositivo deve vibrar quando a notificação aparecer
5. Para testar vibração in-app, abra o app e receba uma mensagem de outra sala

## ⚠️ Troubleshooting

**O som não está tocando:**
- Verifique se o arquivo `public/notification-sound.mp3` existe
- Verifique o console do navegador para erros
- Certifique-se de que o Service Worker está registrado
- Verifique se o navegador permite reprodução de áudio (alguns navegadores bloqueiam áudio autoplay)

**O som está muito alto/baixo:**
- Ajuste o volume no código: `audio.volume = 0.7;` em `notification-manager.tsx`
- Ou normalize o arquivo de áudio antes de adicionar

**A vibração não está funcionando:**
- Verifique se o dispositivo suporta vibração (geralmente apenas dispositivos móveis)
- Verifique se o navegador suporta a API de vibração (Chrome, Edge, Safari iOS)
- Verifique o console do navegador para erros
- Alguns navegadores podem bloquear vibração em modo desktop (mesmo que suporte a API)

**A vibração está muito forte/fraca:**
- A intensidade da vibração é controlada pelo hardware do dispositivo
- Você pode ajustar a duração do padrão de vibração em `public/sw.js`
- Padrões mais longos (ex: `[400, 200, 400]`) são mais perceptíveis

