-- Adiciona coluna para rastrear sessão ativa do usuário (detecção de login duplo)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS active_session_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.active_session_at IS 'Última vez que a sessão ativa foi atualizada - usado para detectar login em múltiplos dispositivos';
