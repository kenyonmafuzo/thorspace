-- Função que cria profile, player_stats e player_progress automaticamente
-- quando um novo usuário confirma o email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_value TEXT;
BEGIN
  -- Pegar username do metadata, ou gerar um baseado no email
  username_value := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'user_' || substring(NEW.id::text, 1, 8)
  );

  -- Criar profile
  INSERT INTO public.profiles (id, username, avatar_preset, created_at)
  VALUES (
    NEW.id,
    username_value,
    'normal',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Criar player_stats
  INSERT INTO public.player_stats (
    user_id,
    matches_played,
    wins,
    draws,
    losses,
    ships_destroyed,
    ships_lost,
    created_at
  )
  VALUES (
    NEW.id,
    0,
    0,
    0,
    0,
    0,
    0,
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Criar player_progress
  INSERT INTO public.player_progress (
    user_id,
    level,
    xp,
    xp_to_next,
    total_xp,
    created_at
  )
  VALUES (
    NEW.id,
    1,
    0,
    300,
    0,
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que executa a função quando usuário é criado no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Comentário
COMMENT ON FUNCTION public.handle_new_user() IS 'Cria automaticamente profile, player_stats e player_progress quando novo usuário é criado';
