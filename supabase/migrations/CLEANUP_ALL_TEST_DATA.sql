-- ⚠️ ATENÇÃO: Este script DELETA TODOS OS DADOS DO BANCO
-- Use apenas em ambiente de desenvolvimento/teste
-- NÃO EXECUTE EM PRODUÇÃO sem backup!

-- Desabilitar temporariamente as restrições de foreign key
SET session_replication_role = 'replica';

-- 1. Limpar mensagens de chat
DELETE FROM chat_messages;
ALTER SEQUENCE IF EXISTS chat_messages_id_seq RESTART WITH 1;

-- 2. Limpar notificações de inbox
DELETE FROM inbox;
ALTER SEQUENCE IF EXISTS inbox_id_seq RESTART WITH 1;

-- 3. Limpar friend requests
DELETE FROM friend_requests;

-- 4. Limpar matches (partidas)
DELETE FROM matches;

-- 5. Limpar estatísticas dos jogadores
DELETE FROM player_stats;

-- 6. Limpar perfis (profiles)
-- ATENÇÃO: Isso vai deletar TODOS os usuários!
DELETE FROM profiles;

-- 8. Limpar usuários do auth (se necessário)
-- DESCOMENTAR APENAS SE QUISER DELETAR TAMBÉM DO AUTH.USERS
-- DELETE FROM auth.users;

-- Reabilitar as restrições de foreign key
SET session_replication_role = 'origin';

-- Verificar o que sobrou
SELECT 
  'profiles' as tabela, COUNT(*) as registros FROM profiles
UNION ALL
SELECT 'player_stats', COUNT(*) FROM player_stats
UNION ALL
SELECT 'matches', COUNT(*) FROM matches
UNION ALL
SELECT 'inbox', COUNT(*) FROM inbox
UNION ALL
SELECT 'friend_requests', COUNT(*) FROM friend_requests
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM chat_messages;
