-- Script para corrigir o índice problemático na migration de mensagens temporárias
-- Execute este script se você recebeu o erro: "functions in index predicate must be marked IMMUTABLE"

-- Remover o índice problemático se ele existir
DROP INDEX IF EXISTS idx_messages_expires_at_active;

-- O índice simples já é suficiente para otimizar as queries
-- O índice idx_messages_expires_at (com WHERE expires_at IS NOT NULL) já foi criado
-- e é suficiente para as queries de limpeza funcionarem eficientemente


