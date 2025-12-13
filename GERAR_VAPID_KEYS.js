/**
 * Script para gerar chaves VAPID
 * Execute: node GERAR_VAPID_KEYS.js
 */

const webpush = require('web-push');

console.log('🔑 Gerando chaves VAPID...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ Chaves geradas com sucesso!\n');
console.log('📋 Adicione estas variáveis ao seu .env.local:\n');
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('VAPID_EMAIL=mailto:seu-email@exemplo.com');
console.log('\n⚠️  IMPORTANTE:');
console.log('   - VAPID_EMAIL deve começar com "mailto:"');
console.log('   - Exemplo: mailto:gomesrodrigo528@gmail.com');
console.log('   - O código adiciona "mailto:" automaticamente se você esquecer, mas é melhor usar o formato completo\n');
console.log('⚠️  IMPORTANTE: Mantenha a chave privada SECRETA!');

