-- Add bio column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comment to document the field
COMMENT ON COLUMN users.bio IS 'Biografia do usuário (máximo 500 caracteres)';
