-- Migration: Add my_kills and opp_kills columns to matches
-- Date: 2026-01-21

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS my_kills integer;

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS opp_kills integer;

-- Opcional: comentários para documentação
COMMENT ON COLUMN public.matches.my_kills IS 'Kills do jogador principal na partida';
COMMENT ON COLUMN public.matches.opp_kills IS 'Kills do oponente na partida';
