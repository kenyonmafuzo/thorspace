-- RLS Policies para match_events (AAA Multiplayer System)
-- Permite que ambos jogadores do match vejam TODOS os eventos do match

-- Habilitar RLS na tabela match_events
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- Policy 1: INSERT - Jogadores podem inserir eventos nos seus matches
CREATE POLICY "Players can insert events in their matches"
ON match_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = match_events.match_id
    AND (matches.player1_id = auth.uid() OR matches.player2_id = auth.uid())
  )
);

-- Policy 2: SELECT - Jogadores podem ver TODOS os eventos dos seus matches
-- (não apenas os próprios eventos, mas também os eventos do oponente)
CREATE POLICY "Players can view all events in their matches"
ON match_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = match_events.match_id
    AND (matches.player1_id = auth.uid() OR matches.player2_id = auth.uid())
  )
);

-- Comentário para documentação
COMMENT ON TABLE match_events IS 'Stores all match events for AAA multiplayer system. Both players can see all events in their matches.';
