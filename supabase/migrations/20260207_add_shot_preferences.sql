-- ============================================
-- SHOT TYPE PREFERENCES - AAA COSMETIC SYSTEM
-- ============================================
-- Adicionar coluna para preferências de tipo de tiro por nave
-- Sistema cosmético apenas - não afeta gameplay

-- Adicionar coluna shot_preferences (JSONB)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS shot_preferences JSONB DEFAULT '{"1": "plasma", "2": "plasma", "3": "plasma"}'::jsonb;

-- Comentário
COMMENT ON COLUMN profiles.shot_preferences IS 
'Preferências de tipo de tiro por nave (cosmético apenas).
Estrutura: {"1": "plasma", "2": "plasma", "3": "pulse"}
Tipos disponíveis: plasma, pulse, energy
Índice 1-3 representa cada nave selecionada.';

-- Index para queries rápidas (opcional mas recomendado)
CREATE INDEX IF NOT EXISTS idx_profiles_shot_preferences 
ON profiles USING GIN (shot_preferences);

-- Garantir que usuários existentes tenham o default
UPDATE profiles 
SET shot_preferences = '{"1": "plasma", "2": "plasma", "3": "plasma"}'::jsonb 
WHERE shot_preferences IS NULL;
