# Checklist de Testes - Multiplayer Determinístico

## 📋 Execute estes testes após aplicar as mudanças no banco

---

## ✅ Pré-requisitos

- [ ] SQL executado no Supabase (ver `MULTIPLAYER_SCHEMA_UPDATES.md`)
- [ ] Tabela `match_events` criada
- [ ] Colunas `player1_id`, `player2_id`, `turn_user_id` adicionadas em `matches`
- [ ] Colunas `player1_ships`, `player2_ships` adicionadas em `matches`
- [ ] Realtime habilitado para ambas as tabelas
- [ ] RLS policies atualizadas

---

## 🧪 Testes Funcionais

### 1. Inicialização
- [ ] **Teste 1.1**: Abrir jogo em duas abas com contas diferentes
- [ ] **Teste 1.2**: Console mostra `[PVP] ✓✓✓ MODO MULTIPLAYER ATIVADO (DETERMINÍSTICO) ✓✓✓`
- [ ] **Teste 1.3**: Verificar `player1_id` e `player2_id` no console
- [ ] **Teste 1.4**: Tentar abrir jogo com conta que NÃO é participante → deve bloquear com erro

**Resultado esperado:**
```
[PVP] ✓ player1_id (BLUE): f83f4cf3-...
[PVP] ✓ player2_id (RED): bab97f02-...
```

---

### 2. Validação de Permissão
- [ ] **Teste 2.1**: Criar match entre User A e User B
- [ ] **Teste 2.2**: Tentar abrir com User C → deve mostrar erro de acesso negado
- [ ] **Teste 2.3**: Verificar mensagem: `❌ ACESSO NEGADO: Você não é participante deste match`

**Comando SQL para testar:**
```sql
-- Verificar participantes do match
SELECT player1_id, player2_id FROM matches WHERE id = 'seu-match-id';
```

---

### 3. Seleção de Naves
- [ ] **Teste 3.1**: Player 1 (BLUE) seleciona 3 naves → clica "Pronto!"
- [ ] **Teste 3.2**: Verificar no console: `[PVP] Salvando em player1_ships (BLUE)`
- [ ] **Teste 3.3**: Player 2 (RED) seleciona 3 naves → clica "Pronto!"
- [ ] **Teste 3.4**: Verificar no console: `[PVP] Salvando em player2_ships (RED)`

**Verificar no Supabase:**
```sql
SELECT 
  player1_ships, 
  player2_ships, 
  ready_blue, 
  ready_red 
FROM matches 
WHERE id = 'seu-match-id';
```

**Resultado esperado:**
```json
{
  "player1_ships": [1, 1, 1],
  "player2_ships": [2, 2, 2],
  "ready_blue": true,
  "ready_red": true
}
```

---

### 4. Início de Batalha
- [ ] **Teste 4.1**: Ambos clicam "Pronto!" → batalha deve iniciar em AMBAS as abas
- [ ] **Teste 4.2**: Verificar no console: `[PVP] 🚀 INICIANDO BATALHA MULTIPLAYER (DETERMINÍSTICO)`
- [ ] **Teste 4.3**: Verificar: `[PVP] ✓ EU SOU PLAYER1 (BLUE)` em uma aba
- [ ] **Teste 4.4**: Verificar: `[PVP] ✓ EU SOU PLAYER2 (RED)` na outra aba
- [ ] **Teste 4.5**: Canvas deve aparecer em ambas as abas

**Verificar render:**
- [ ] Na aba BLUE: naves azuis em cima, vermelhas embaixo
- [ ] Na aba RED: naves azuis em cima, vermelhas embaixo (SIM, mesmo render!)
- [ ] Naves RED não devem aparecer azuis na aba do jogador RED

---

### 5. Sistema de Turnos
- [ ] **Teste 5.1**: Verificar no console: `[PVP] ✓ turn_user_id: <UUID>`
- [ ] **Teste 5.2**: Player 1 deve ter `isMyTurn: true` inicialmente
- [ ] **Teste 5.3**: Player 2 deve ter `isMyTurn: false` e ver popup "Aguarde"
- [ ] **Teste 5.4**: Player 1 finaliza turno → `turn_user_id` muda para Player 2
- [ ] **Teste 5.5**: Popup "Aguarde" aparece em Player 1
- [ ] **Teste 5.6**: Popup desaparece em Player 2

**Verificar no console:**
```
[PVP] 🔄 turn_user_id mudou: f83f4cf3-... → bab97f02-...
[PVP] isMyTurn: false
```

**Verificar no Supabase:**
```sql
SELECT 
  turn_user_id, 
  turn_index, 
  updated_at 
FROM matches 
WHERE id = 'seu-match-id';
```

---

### 6. Sistema de Eventos

#### 6.1 Enviar Evento
- [ ] **Teste 6.1.1**: Player 1 executa ação (movimento/tiro)
- [ ] **Teste 6.1.2**: Verificar no console: `[EVENTS] 📤 Enviando evento:`
- [ ] **Teste 6.1.3**: Player 2 recebe evento: `[EVENTS] 📨 Evento recebido:`

**Verificar no Supabase:**
```sql
SELECT * FROM match_events 
WHERE match_id = 'seu-match-id' 
ORDER BY created_at DESC 
LIMIT 5;
```

#### 6.2 Ignorar Próprios Eventos
- [ ] **Teste 6.2.1**: Player 1 envia evento
- [ ] **Teste 6.2.2**: Player 1 recebe via Realtime
- [ ] **Teste 6.2.3**: Verificar: `[EVENTS] ⏭️ Ignorando meu próprio evento`

#### 6.3 Reproduzir Eventos
- [ ] **Teste 6.3.1**: Player 1 move nave
- [ ] **Teste 6.3.2**: Player 2 vê animação de movimento
- [ ] **Teste 6.3.3**: Verificar: `[EVENTS] 🚀 Reproduzindo movimento do oponente`

---

### 7. Sincronização em Tempo Real

#### 7.1 Latência
- [ ] **Teste 7.1.1**: Player 1 executa ação
- [ ] **Teste 7.1.2**: Medir tempo até Player 2 ver (deve ser < 500ms)
- [ ] **Teste 7.1.3**: Verificar timestamps nos eventos

#### 7.2 Ordem de Eventos
- [ ] **Teste 7.2.1**: Player 1 envia 3 eventos rápidos
- [ ] **Teste 7.2.2**: Player 2 recebe na mesma ordem
- [ ] **Teste 7.2.3**: Verificar `turn_number` nos eventos

---

## 🐛 Testes de Edge Cases

### 8. Desconexão
- [ ] **Teste 8.1**: Player 1 fecha aba
- [ ] **Teste 8.2**: Player 2 continua recebendo eventos? (não)
- [ ] **Teste 8.3**: Player 1 reabre → reconecta corretamente

### 9. Sincronização Após Lag
- [ ] **Teste 9.1**: Simular lag de 5 segundos (throttle no DevTools)
- [ ] **Teste 9.2**: Verificar se eventos são processados após lag
- [ ] **Teste 9.3**: Verificar se estado está sincronizado

### 10. Múltiplos Eventos Simultâneos
- [ ] **Teste 10.1**: Ambos os jogadores agem ao mesmo tempo
- [ ] **Teste 10.2**: Verificar que ambos recebem eventos do outro
- [ ] **Teste 10.3**: Verificar que não há conflitos de estado

---

## 🔍 Testes de Console

### Logs Esperados (Player 1 - BLUE):
```
[PVP] ========================================
[PVP] Inicializando modo multiplayer
[PVP] ✓ player1_id (BLUE): f83f4cf3-6fad-4bc1-8102-c695d6e99a25
[PVP] ✓ player2_id (RED): bab97f02-b9ab-4c33-89b9-607b4e5bb98a
[PVP] ✓ turn_user_id: f83f4cf3-6fad-4bc1-8102-c695d6e99a25
[PVP] ✓ isMyTurn: true
[PVP] ✓✓✓ MODO MULTIPLAYER ATIVADO (DETERMINÍSTICO) ✓✓✓
[PVP] Canal de estado do match conectado
[EVENTS] Canal de eventos do match conectado
```

### Logs Esperados (Player 2 - RED):
```
[PVP] ========================================
[PVP] Inicializando modo multiplayer
[PVP] ✓ player1_id (BLUE): f83f4cf3-6fad-4bc1-8102-c695d6e99a25
[PVP] ✓ player2_id (RED): bab97f02-b9ab-4c33-89b9-607b4e5bb98a
[PVP] ✓ turn_user_id: f83f4cf3-6fad-4bc1-8102-c695d6e99a25
[PVP] ✓ isMyTurn: false
[PVP] ✓✓✓ MODO MULTIPLAYER ATIVADO (DETERMINÍSTICO) ✓✓✓
[PVP] Canal de estado do match conectado
[EVENTS] Canal de eventos do match conectado
```

---

## 📊 Testes de Database

### Verificar Estrutura:
```sql
-- 1. Verificar colunas
\d matches

-- 2. Verificar match
SELECT 
  id,
  player1_id,
  player2_id,
  turn_user_id,
  player1_ships,
  player2_ships,
  phase,
  ready_blue,
  ready_red
FROM matches 
WHERE id = 'seu-match-id';

-- 3. Verificar eventos
SELECT 
  id,
  match_id,
  user_id,
  turn_number,
  type,
  payload,
  created_at
FROM match_events 
WHERE match_id = 'seu-match-id' 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Verificar RLS
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('matches', 'match_events');
```

---

## ✅ Critérios de Sucesso

Para considerar o sistema aprovado, TODOS os testes devem passar:

- [ ] ✅ Inicialização determinística (IDs corretos)
- [ ] ✅ Validação de permissão funciona
- [ ] ✅ Seleção de naves salva em campos corretos
- [ ] ✅ Batalha inicia em ambas as abas
- [ ] ✅ Render correto (BLUE em cima, RED embaixo)
- [ ] ✅ Turno baseado em `turn_user_id`
- [ ] ✅ Popup "Aguarde" condicional
- [ ] ✅ Eventos são enviados e recebidos
- [ ] ✅ Próprios eventos são ignorados
- [ ] ✅ Ações do oponente são reproduzidas
- [ ] ✅ Sincronização em tempo real (< 500ms)
- [ ] ✅ DB como fonte de verdade
- [ ] ✅ Sem erros no console

---

## 🚨 Problemas Comuns

### Se batalha não inicia:
1. Verificar `PVP.hasInitialized` no console
2. Verificar `PVP.battleStarted` no console
3. Verificar `ready_blue` e `ready_red` no DB
4. Verificar se Realtime está conectado

### Se eventos não chegam:
1. Verificar no Supabase Dashboard → Realtime → Logs
2. Verificar se tabela `match_events` está no publication
3. Verificar RLS policies
4. Verificar `matchEventsChannel` no console

### Se turno não alterna:
1. Verificar `turn_user_id` no DB
2. Verificar `isMyTurn` no console
3. Verificar se `handleMatchUpdate` está sendo chamado
4. Verificar logs: `[PVP] 🔄 turn_user_id mudou`

---

## 📝 Relatório de Testes

Use este template para reportar resultados:

```
## Teste: [Nome do Teste]
Data: [DD/MM/YYYY]
Testador: [Seu Nome]

### Ambiente
- Browser: [Chrome/Firefox/Safari]
- Supabase Project: [ID]
- Match ID: [UUID]

### Resultados
- [ ] ✅ Passou
- [ ] ❌ Falhou
- [ ] ⚠️ Parcialmente

### Observações
[Descrever comportamento observado]

### Logs
```
[Colar logs relevantes do console]
```

### Screenshots
[Anexar se necessário]
```

---

## 🔗 Recursos

- [MULTIPLAYER_SCHEMA_UPDATES.md](./MULTIPLAYER_SCHEMA_UPDATES.md) - SQL para executar
- [MULTIPLAYER_CHANGES_SUMMARY.md](./MULTIPLAYER_CHANGES_SUMMARY.md) - Resumo das mudanças
- [EVENTS_USAGE_GUIDE.md](./EVENTS_USAGE_GUIDE.md) - Como usar eventos
