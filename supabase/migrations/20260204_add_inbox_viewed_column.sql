-- Migration: Adicionar coluna viewed na tabela inbox
-- Criado em: 2026-02-04

-- 1. Adicionar coluna viewed (default false = não lido)
ALTER TABLE inbox
ADD COLUMN IF NOT EXISTS viewed BOOLEAN DEFAULT FALSE;

-- 2. Criar índice para performance de consultas de não lidos
CREATE INDEX IF NOT EXISTS idx_inbox_user_viewed ON inbox(user_id, viewed);

-- 3. Comentário
COMMENT ON COLUMN inbox.viewed IS 'Se a notificação já foi visualizada pelo usuário';
