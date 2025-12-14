-- ============================================
-- MIGRATION: User Bio Feature
-- ============================================
-- Execute este script no Supabase SQL Editor
-- ou via CLI: supabase db push
-- ============================================

-- Add bio column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comment to document the field
COMMENT ON COLUMN users.bio IS 'Biografia do usuário (máximo 500 caracteres)';

-- ============================================
-- NOTAS:
-- ============================================
-- 1. O campo bio é opcional e pode ser NULL
-- 2. A validação de 500 caracteres é feita no backend (API)
-- 3. O campo será retornado nas APIs:
--    - /api/auth/me
--    - /api/users/[userId]
--    - /api/profile/update
-- ============================================
