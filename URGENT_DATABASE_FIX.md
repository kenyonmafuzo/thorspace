# 🔧 CORREÇÃO URGENTE: Schema do Banco de Dados

## ⚠️ PROBLEMA DETECTADO

O código está tentando usar colunas que não existem na tabela `matches`:
- `action_blue`
- `action_red`
- `submitted_blue`
- `submitted_red`
- `turn_number`
- `turn_deadline_at`
- `turn_resolved_at`
- `turn_user_id`
- `player1_id`
- `player2_id`
- `player1_ships`
- `player2_ships`

## ✅ SOLUÇÃO

Execute a migration SQL no Supabase Dashboard:

### Passo 1: Acessar SQL Editor
1. Vá para https://supabase.com/dashboard/project/tnzvtvtwhvlffoqcvpmj
2. Clique em "SQL Editor" no menu lateral
3. Clique em "New Query"

### Passo 2: Executar Migration
Cole e execute o seguinte SQL:

```sql
-- Migration: Add turn-based system columns to matches table
-- Date: 2026-01-06

-- Add turn system columns
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS turn_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS turn_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS turn_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS turn_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS player1_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS player2_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS turn_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS player1_ships jsonb,
  ADD COLUMN IF NOT EXISTS player2_ships jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_turn_number ON public.matches(turn_number);
CREATE INDEX IF NOT EXISTS idx_matches_turn_deadline ON public.matches(turn_deadline_at);
CREATE INDEX IF NOT EXISTS idx_matches_player1_id ON public.matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2_id ON public.matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_turn_user_id ON public.matches(turn_user_id);

-- Add comments
COMMENT ON COLUMN public.matches.turn_number IS 'Current turn number in the match';
COMMENT ON COLUMN public.matches.turn_deadline_at IS 'Deadline for current turn (15 seconds)';
COMMENT ON COLUMN public.matches.turn_resolved_at IS 'When the turn was resolved';
COMMENT ON COLUMN public.matches.turn_user_id IS 'Which player should act in current turn';
```

### Passo 3: Verificar
Execute para verificar se as colunas foram criadas:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'matches' 
ORDER BY ordinal_position;
```

## 🔄 WORKAROUND TEMPORÁRIO

O código foi modificado para usar `ships_blue` e `ships_red` como armazenamento temporário das ações enquanto você não executa a migration. Mas isso é apenas um workaround - **execute a migration o mais rápido possível** para o sistema funcionar corretamente.

## 📝 NOTA IMPORTANTE

Depois de executar a migration, você precisa RECARREGAR a página do jogo (F5) para que as mudanças tenham efeito.
