-- ⚠️ ATENÇÃO: Este script DELETA TODOS OS USUÁRIOS DO AUTH
-- Depois de executar, todos terão que se cadastrar novamente!

-- Deletar todos os usuários do sistema de autenticação
DELETE FROM auth.users;

-- Verificar quantos usuários sobraram
SELECT COUNT(*) as total_usuarios FROM auth.users;
