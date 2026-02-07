-- 🔐 GRANT EXECUTE on finalize_match_once RPC to authenticated users
-- This allows the API route to call the RPC without service role key

-- Grant execute permission to authenticated users (não public!)
GRANT EXECUTE ON FUNCTION public.finalize_match_once(
  uuid, uuid, uuid, int, int, int, int
) TO authenticated;

-- Revoke from public (segurança)
REVOKE EXECUTE ON FUNCTION public.finalize_match_once(
  uuid, uuid, uuid, int, int, int, int
) FROM public, anon;

-- Verificar permissões
SELECT 
  routine_name,
  routine_type,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'finalize_match_once';
