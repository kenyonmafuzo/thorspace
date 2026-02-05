# Migration: Add last_action_blue and last_action_red columns

## Problema que resolve
As ações dos jogadores (`action_blue`, `action_red`) estavam sendo limpadas antes do Realtime UPDATE chegar nos clientes, causando:
- Animações não executando (ações sempre `idle`)
- Naves atirando do turno anterior

## Solução
Adicionar campos `last_action_blue` e `last_action_red` que armazenam as ações resolvidas para sincronização via Realtime.

## Como executar

### 1. Via Supabase Dashboard (RECOMENDADO)
1. Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
2. Cole o SQL abaixo e execute:

```sql
-- Add columns for storing last resolved turn actions
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS last_action_blue jsonb,
ADD COLUMN IF NOT EXISTS last_action_red jsonb;

-- Add helpful comment
COMMENT ON COLUMN matches.last_action_blue IS 'Last resolved action from blue team (player1) for Realtime sync';
COMMENT ON COLUMN matches.last_action_red IS 'Last resolved action from red team (player2) for Realtime sync';
```

### 2. Via CLI (alternativo)
```bash
supabase db push
```

## Verificação
Execute para confirmar:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'matches' 
AND column_name IN ('last_action_blue', 'last_action_red');
```

Deve retornar 2 linhas mostrando ambas as colunas do tipo `jsonb`.
