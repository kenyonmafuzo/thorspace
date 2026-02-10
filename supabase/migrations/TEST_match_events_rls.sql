-- TESTE: Verificar RLS policies da tabela match_events
-- Execute este SQL no Supabase Dashboard para diagnosticar o problema

-- 1. Verificar se RLS está habilitado
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'match_events';
-- Resultado esperado: relrowsecurity = true

-- 2. Listar todas as policies da tabela match_events
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'match_events';
-- Resultado esperado: 2 policies (INSERT e SELECT)

-- 3. Verificar eventos recentes na tabela
SELECT id, match_id, user_id, type, sequence_number, created_at
FROM match_events
ORDER BY created_at DESC
LIMIT 10;
-- Deve mostrar os eventos que P1 criou

-- 4. Testar se o usuário atual pode ver eventos
-- (Substitua YOUR_MATCH_ID pelo matchId do teste)
SELECT COUNT(*) as total_events
FROM match_events
WHERE match_id = 'YOUR_MATCH_ID';
-- Se retornar 0 mas você sabe que há eventos, RLS está bloqueando
