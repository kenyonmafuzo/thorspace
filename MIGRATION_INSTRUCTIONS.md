# Instruções para Executar a Migration

## Migration: 20260108_add_action_columns.sql

Esta migration adiciona as colunas necessárias para o sistema de ações por turno.

### Como executar no Supabase:

1. Acesse o Supabase Dashboard: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Copie e cole o conteúdo do arquivo:
   ```
   supabase/migrations/20260108_add_action_columns.sql
   ```
6. Clique em **Run** ou pressione `Ctrl/Cmd + Enter`

### Verificar se funcionou:

Execute esta query no SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'matches' 
AND column_name IN ('action_blue', 'action_red', 'submitted_blue', 'submitted_red')
ORDER BY column_name;
```

Você deve ver 4 linhas retornadas com as novas colunas.

### Após executar a migration:

O sistema continuará funcionando normalmente. O código atual usa um workaround com `ships_blue/ships_red` que funciona, mas após a migration ser executada, você pode atualizar o código para usar as colunas corretas (`action_blue/action_red`).

---

## Alterações Implementadas no Código

1. **Sistema de Ações**: Usando `ships_blue/ships_red` com prefixo `{type: 'ACTION', ...}` temporariamente
2. **Cores das Naves**: Corrigido para usar `myTeam` ao invés de posição
3. **Timer**: Adicionado guard global `window.__activeTurnTimer` para evitar múltiplos timers

## Problemas Corrigidos

- ✅ Erro 400 "Could not find action_red column" - usando workaround
- ✅ Naves do desafiado com cores erradas - corrigido lógica de tint
- ✅ Timer pulando - adicionado guard global (em progresso)
