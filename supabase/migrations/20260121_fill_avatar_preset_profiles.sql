-- Migration: Preencher avatar_preset em profiles para todos os usuários
-- Data: 2026-01-21
-- Preenche avatar_preset com o valor salvo em settings.avatar_ship, se existir, ou 'normal' como padrão

UPDATE profiles
SET avatar_preset = COALESCE(
  (settings->>'avatar_ship'),
  'normal'
)
WHERE avatar_preset IS NULL OR avatar_preset = '';
