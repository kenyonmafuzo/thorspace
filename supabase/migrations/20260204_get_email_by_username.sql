-- Função RPC para buscar email pelo username (usado no login)
-- Permite que usuários façam login com username ao invés de email

CREATE OR REPLACE FUNCTION get_email_by_username(username_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_found UUID;
  email_found TEXT;
BEGIN
  -- Buscar user_id pelo username
  SELECT id INTO user_id_found
  FROM profiles
  WHERE username = username_input
  LIMIT 1;
  
  -- Se não encontrou username, retornar null
  IF user_id_found IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar email na tabela auth.users
  SELECT email INTO email_found
  FROM auth.users
  WHERE id = user_id_found;
  
  RETURN email_found;
END;
$$;

-- Permitir que qualquer pessoa chame essa função (apenas para login)
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO anon, authenticated;
