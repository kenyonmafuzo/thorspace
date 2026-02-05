-- Migration: Sistema de Login Diário com Streak
-- Criado em: 2026-02-04

-- 1. Adicionar colunas para tracking de login diário
ALTER TABLE player_stats
ADD COLUMN IF NOT EXISTS last_daily_login DATE,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;

-- 2. Remover função antiga se existir
DROP FUNCTION IF EXISTS claim_daily_xp();

-- 3. Criar função para calcular e dar XP de login diário
CREATE OR REPLACE FUNCTION claim_daily_xp()
RETURNS TABLE (
  awarded_xp INTEGER,
  new_streak INTEGER,
  streak_broken BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_last_login DATE;
  v_current_streak INTEGER;
  v_today DATE;
  v_yesterday DATE;
  v_xp_award INTEGER;
  v_new_streak INTEGER;
  v_streak_broken BOOLEAN := FALSE;
  v_message TEXT;
BEGIN
  -- Pegar user_id da sessão atual
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Data de hoje (no fuso horário UTC ou do servidor)
  v_today := CURRENT_DATE;
  v_yesterday := v_today - INTERVAL '1 day';

  -- Buscar último login e streak atual
  SELECT last_daily_login, COALESCE(current_streak, 0)
  INTO v_last_login, v_current_streak
  FROM player_stats
  WHERE user_id = v_user_id;

  -- Se não existe registro, criar
  IF NOT FOUND THEN
    INSERT INTO player_stats (user_id, last_daily_login, current_streak)
    VALUES (v_user_id, v_today, 1);
    
    v_xp_award := 20;
    v_new_streak := 1;
    v_message := 'Primeiro login! Bem-vindo!';
    
    -- Conceder XP
    PERFORM increment_total_xp(v_user_id, v_xp_award);
    
    RETURN QUERY SELECT v_xp_award, v_new_streak, v_streak_broken, v_message;
    RETURN;
  END IF;

  -- Se já fez login hoje, não dar XP
  IF v_last_login = v_today THEN
    RETURN QUERY SELECT 0::INTEGER, v_current_streak, FALSE, 'Já recebeu XP hoje'::TEXT;
    RETURN;
  END IF;

  -- Verificar se perdeu a streak (mais de 1 dia sem logar)
  IF v_last_login < v_yesterday THEN
    v_streak_broken := TRUE;
    v_new_streak := 1;
    v_message := '⚠️ Sequência perdida! Você não se conectou ontem e sua sequência de ' || v_current_streak || ' dias foi reiniciada. Comece uma nova sequência fazendo login todos os dias!';
  ELSE
    -- Login consecutivo (ontem foi o último login)
    v_new_streak := v_current_streak + 1;
    -- Limitar streak no máximo 7 para efeitos de cálculo
    IF v_new_streak > 7 THEN
      v_new_streak := 7;
    END IF;
    v_message := 'Sequência mantida!';
  END IF;

  -- Calcular XP baseado na streak (20, 30, 40, 50, 60, 80, 100)
  CASE v_new_streak
    WHEN 1 THEN v_xp_award := 20;
    WHEN 2 THEN v_xp_award := 30;
    WHEN 3 THEN v_xp_award := 40;
    WHEN 4 THEN v_xp_award := 50;
    WHEN 5 THEN v_xp_award := 60;
    WHEN 6 THEN v_xp_award := 80;
    ELSE v_xp_award := 100; -- 7+ dias
  END CASE;

  -- Atualizar player_stats
  UPDATE player_stats
  SET 
    last_daily_login = v_today,
    current_streak = v_new_streak,
    login_days = COALESCE(login_days, 0) + 1,
    login_streak = v_new_streak
  WHERE user_id = v_user_id;

  -- Conceder XP
  PERFORM increment_total_xp(v_user_id, v_xp_award);

  -- Retornar resultado
  RETURN QUERY SELECT v_xp_award, v_new_streak, v_streak_broken, v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Comentários
COMMENT ON COLUMN player_stats.last_daily_login IS 'Data do último login diário (para calcular streaks)';
COMMENT ON COLUMN player_stats.current_streak IS 'Sequência atual de dias consecutivos de login';
COMMENT ON FUNCTION claim_daily_xp IS 'Calcula e concede XP de login diário, gerencia streaks e detecta quando a sequência é quebrada';
