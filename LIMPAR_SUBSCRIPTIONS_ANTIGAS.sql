-- Script para limpar todas as subscriptions antigas
-- Use isso quando regenerar as chaves VAPID
-- Execute no Supabase SQL Editor

-- AVISO: Isso removerá TODAS as subscriptions
-- Os usuários precisarão ativar notificações novamente

-- Ver quantas subscriptions existem
SELECT COUNT(*) as total_subscriptions FROM push_subscriptions;

-- Ver subscriptions por usuário
SELECT 
  u.email,
  u.name,
  COUNT(ps.id) as subscription_count,
  MAX(ps.created_at) as last_subscription
FROM users u
LEFT JOIN push_subscriptions ps ON ps.user_id = u.id
GROUP BY u.id, u.email, u.name
HAVING COUNT(ps.id) > 0
ORDER BY subscription_count DESC;

-- OPÇÃO 1: Limpar TODAS as subscriptions
-- Descomente a linha abaixo para executar
DELETE FROM push_subscriptions;

-- OPÇÃO 2: Limpar apenas subscriptions antigas (mais de 1 dia)
-- DELETE FROM push_subscriptions 
-- WHERE created_at < NOW() - INTERVAL '1 day';

-- OPÇÃO 3: Limpar subscriptions de usuários específicos
-- DELETE FROM push_subscriptions 
-- WHERE user_id IN (
--   'user-id-1',
--   'user-id-2'
-- );

-- Verificar resultado
SELECT COUNT(*) as remaining_subscriptions FROM push_subscriptions;

