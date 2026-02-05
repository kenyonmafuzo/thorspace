# Atualizações Necessárias no Schema do Banco de Dados

## ⚠️ ATENÇÃO: Execute estas alterações no Supabase antes de testar

Para que o sistema multiplayer 100% determinístico funcione, você precisa atualizar o schema da tabela `matches` e criar a tabela `match_events`.

---

## 1. Atualizar tabela `matches`

Execute no SQL Editor do Supabase:

```sql
-- Adicionar colunas para sistema determinístico
ALTER TABLE matches 
  ADD COLUMN IF NOT EXISTS player1_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS player2_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS turn_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS player1_ships JSONB,
  ADD COLUMN IF NOT EXISTS player2_ships JSONB;

-- Migrar dados existentes (se houver)
-- Copiar player1 -> player1_id e player2 -> player2_id
UPDATE matches 
SET player1_id = player1::uuid
WHERE player1 IS NOT NULL AND player1_id IS NULL;

UPDATE matches 
SET player2_id = player2::uuid
WHERE player2 IS NOT NULL AND player2_id IS NULL;

-- Copiar ships_blue -> player1_ships e ships_red -> player2_ships
UPDATE matches 
SET player1_ships = ships_blue
WHERE ships_blue IS NOT NULL AND player1_ships IS NULL;

UPDATE matches 
SET player2_ships = ships_red
WHERE ships_red IS NOT NULL AND player2_ships IS NULL;

-- Definir turn_user_id inicial (player1 sempre começa)
UPDATE matches 
SET turn_user_id = player1_id
WHERE turn_user_id IS NULL AND player1_id IS NOT NULL AND phase = 'battle';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_matches_player1_id ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2_id ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_turn_user_id ON matches(turn_user_id);

-- (OPCIONAL) Remover colunas antigas após confirmar que tudo funciona
-- ALTER TABLE matches DROP COLUMN IF EXISTS ships_blue;
-- ALTER TABLE matches DROP COLUMN IF EXISTS ships_red;
-- ALTER TABLE matches DROP COLUMN IF EXISTS turn;
```

---

## 2. Criar tabela `match_events`

Esta tabela armazena eventos de ações (tiros, movimentos) para sincronização em tempo real:

```sql
-- Criar tabela de eventos
CREATE TABLE IF NOT EXISTS match_events (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  turn_number INT NOT NULL DEFAULT 1,
  type TEXT NOT NULL, -- 'move', 'shoot', 'damage', etc
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar índices para queries rápidas
CREATE INDEX idx_match_events_match_id ON match_events(match_id);
CREATE INDEX idx_match_events_turn ON match_events(match_id, turn_number);
CREATE INDEX idx_match_events_created_at ON match_events(created_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- Policy: Jogadores podem inserir eventos nos seus matches
CREATE POLICY "Players can insert events in their matches"
ON match_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = match_events.match_id
    AND (matches.player1_id = auth.uid() OR matches.player2_id = auth.uid())
  )
);

-- Policy: Jogadores podem ler eventos dos seus matches
CREATE POLICY "Players can read events from their matches"
ON match_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = match_events.match_id
    AND (matches.player1_id = auth.uid() OR matches.player2_id = auth.uid())
  )
);

-- Habilitar Realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE match_events;
```

---

## 3. Atualizar RLS policies da tabela `matches`

Certifique-se de que as policies permitem leitura/atualização baseada em `player1_id` e `player2_id`:

```sql
-- Dropar policies antigas se necessário
DROP POLICY IF EXISTS "Players can view their own matches" ON matches;
DROP POLICY IF EXISTS "Players can update their own matches" ON matches;

-- Policy: Jogadores podem ver matches onde são participantes (via player1_id ou player2_id)
CREATE POLICY "Players can view their matches via player_id"
ON matches
FOR SELECT
USING (
  player1_id = auth.uid() OR player2_id = auth.uid()
);

-- Policy: Jogadores podem atualizar matches onde são participantes
CREATE POLICY "Players can update their matches via player_id"
ON matches
FOR UPDATE
USING (
  player1_id = auth.uid() OR player2_id = auth.uid()
)
WITH CHECK (
  player1_id = auth.uid() OR player2_id = auth.uid()
);
```

---

## 4. Verificar Realtime

Certifique-se de que a tabela `matches` está habilitada para Realtime:

```sql
-- Verificar se matches está no publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Se não estiver, adicionar:
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
```

---

## 5. Testes recomendados

Após aplicar as mudanças, teste:

1. **Criação de match**: Verificar se `player1_id` e `player2_id` são definidos corretamente
2. **Seleção de naves**: Verificar se `player1_ships` e `player2_ships` são salvos
3. **Início de batalha**: Verificar se `turn_user_id` é definido como `player1_id`
4. **Alternância de turno**: Verificar se `turn_user_id` alterna entre `player1_id` e `player2_id`
5. **Eventos**: Verificar se eventos são inseridos em `match_events` e recebidos via Realtime

---

## 6. Rollback (se necessário)

Se algo der errado, você pode reverter:

```sql
-- Remover colunas novas
ALTER TABLE matches 
  DROP COLUMN IF EXISTS player1_id,
  DROP COLUMN IF EXISTS player2_id,
  DROP COLUMN IF EXISTS turn_user_id,
  DROP COLUMN IF EXISTS player1_ships,
  DROP COLUMN IF EXISTS player2_ships;

-- Dropar tabela de eventos
DROP TABLE IF EXISTS match_events CASCADE;

-- Remover do Realtime
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS match_events;
```

---

## Resumo das Mudanças

### Tabela `matches`
- **Adicionado**: `player1_id`, `player2_id`, `turn_user_id` (UUIDs)
- **Adicionado**: `player1_ships`, `player2_ships` (JSONB)
- **Substituído**: `turn` (string 'blue'/'red') → `turn_user_id` (UUID)
- **Substituído**: `ships_blue`/`ships_red` → `player1_ships`/`player2_ships`

### Tabela `match_events` (nova)
- Armazena eventos de ações: `move`, `shoot`, `damage`
- Sincroniza via Realtime para ambos os clientes
- RLS habilitado para segurança
- Índices para performance

### Benefícios
✅ **100% Determinístico**: Time baseado em UUID, não em strings/localStorage  
✅ **Seguro**: Validação de permissão no código (bloqueia não-participantes)  
✅ **Sincronizado**: Eventos em tempo real garantem animações simultâneas  
✅ **Escalável**: Schema preparado para features futuras  
