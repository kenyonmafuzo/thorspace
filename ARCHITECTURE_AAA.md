# Arquitetura Multiplayer - Padrões AAA

## 🎯 Objetivo

Implementar uma arquitetura robusta, escalável e performática para o sistema multiplayer do Thorspace, inspirada em jogos AAA como League of Legends, Rocket League e Counter-Strike.

## 📐 Princípios Arquiteturais

### 1. Separation of Concerns (SoC)

**ANTES (❌):**
```javascript
// Lógica de navegação acoplada a eventos de banco
.on("postgres_changes", (payload) => {
  router.push('/game'); // ❌ UI logic em data sync
})
```

**DEPOIS (✅):**
```javascript
// Data sync APENAS sincroniza dados
.on("postgres_changes", (payload) => {
  updateMatchState(payload); // Atualiza estado local
});

// UI reage a mudanças de estado
useEffect(() => {
  if (matchState === 'accepted') {
    router.push('/game'); // ✅ UI logic separada
  }
}, [matchState]);
```

### 2. Single Source of Truth (SSOT)

**Estado do match vive em 1 lugar:**
- ❌ Espalhado: localStorage + useState + DB
- ✅ Centralizado: State Machine + Context API

### 3. Idempotência e Guards

**Prevenir processamento duplicado:**
```javascript
// ⛔ GUARD: Prevenir redirecionamento duplicado
const lastProcessed = sessionStorage.getItem('last_redirected_match');
if (lastProcessed === matchId) {
  return; // Já processado, ignorar
}
sessionStorage.setItem('last_redirected_match', matchId);
```

### 4. Fail-Safe e Defensive Programming

**Sempre assumir que algo pode dar errado:**
```javascript
// ✅ Validação defensiva
if (!payload?.new?.id) {
  console.error('Payload inválido');
  return;
}

try {
  await processMatch(payload.new);
} catch (error) {
  console.error('Erro ao processar match:', error);
  // Não crashar, apenas logar
}
```

## 🏗️ Arquitetura de Dados

### Fluxo de Dados (Data Flow)

```
┌─────────────┐
│   Supabase  │ (Source of Truth para persistência)
│  Postgres   │
└──────┬──────┘
       │
       │ Realtime Subscription
       ▼
┌─────────────────┐
│  Match State    │ (Client-side SSOT)
│  Machine        │
└────────┬────────┘
         │
         │ State Change Events
         ▼
┌─────────────────┐
│   React         │ (UI reage a mudanças)
│   Components    │
└─────────────────┘
```

### Match State Lifecycle

```
IDLE → INVITING → LOADING → SHIP_SELECTION → BATTLE → FINISHED → RETURNING_TO_LOBBY → IDLE
  ↓       ↓          ↓            ↓              ↓         ↓              ↓
ERROR ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←← (pode ir para ERROR de qualquer estado)
```

## 🚀 Performance e Otimizações

### 1. Reduzir Latência

**Atual:**
- DB write → trigger → realtime → client: **150-500ms**

**Otimização futura (Phase 2):**
- WebSocket direto: **30-80ms**
- Client prediction: **0ms percebido**

### 2. Debounce e Throttle

```javascript
// ❌ ANTES: Processar todo update
.on('postgres_changes', (payload) => {
  processUpdate(payload); // Executado 10x/segundo!
});

// ✅ DEPOIS: Throttle de updates
.on('postgres_changes', throttle((payload) => {
  processUpdate(payload);
}, 100)); // Máximo 10x/segundo
```

### 3. Batch Operations

```javascript
// ❌ ANTES: 1 query por dado
const username = await getUsername(id);
const avatar = await getAvatar(id);
const stats = await getStats(id);

// ✅ DEPOIS: 1 query com join
const profile = await getProfile(id, ['username', 'avatar', 'stats']);
```

## 🔒 Segurança e Validação

### Server Authority (Host Validation)

**Quem pode fazer o quê:**
- ✅ Host (Player 1): Resolve turnos, valida ações, atualiza HP
- ❌ Client (Player 2): Envia ações, renderiza estado

**Validação dupla:**
```javascript
// Client-side (UX rápida)
if (!isValidMove(move)) {
  showError('Movimento inválido');
  return;
}

// Server-side (autoridade)
const validated = await validateMove(move);
if (!validated) {
  revertMove(); // Rollback
}
```

### Proteção contra Race Conditions

```javascript
// ✅ Usar flags de controle
let isProcessing = false;

async function handleUpdate(payload) {
  if (isProcessing) {
    console.log('Já processando, ignorando...');
    return;
  }
  
  isProcessing = true;
  try {
    await process(payload);
  } finally {
    isProcessing = false;
  }
}
```

## 📊 Monitoramento e Debug

### Logs Estruturados

```javascript
// ✅ Logs com contexto completo
console.log('[MATCH SYNC]', {
  action: 'redirect',
  matchId: payload.new.id,
  state: payload.new.state,
  phase: payload.new.phase,
  timestamp: new Date().toISOString(),
  userId: currentUser.id
});
```

### Histórico de Estados

```javascript
// ✅ State machine mantém histórico
stateMachine.getHistory();
// [
//   { state: 'IDLE', timestamp: 1234567890 },
//   { state: 'LOADING', timestamp: 1234567900, data: {...} },
//   { state: 'BATTLE', timestamp: 1234567950 }
// ]
```

## 🔄 Roadmap de Melhorias

### Phase 1: Fundação (✅ Atual)
- [x] Separar lógica de navegação de data sync
- [x] Adicionar guards contra race conditions
- [x] Logs estruturados
- [x] Validação de transições de estado

### Phase 2: Performance
- [ ] Migrar para WebSockets puros (reduzir latência)
- [ ] Implementar client prediction (movimentos instantâneos)
- [ ] Server reconciliation (corrigir divergências)
- [ ] Debounce/throttle em subscriptions

### Phase 3: Escalabilidade
- [ ] Servidor dedicado para matchmaking
- [ ] Load balancing entre game servers
- [ ] Metrics e telemetry (Datadog/NewRelic)
- [ ] Auto-scaling baseado em carga

### Phase 4: Features AAA
- [ ] Replay system (gravar e reproduzir matches)
- [ ] Spectator mode (assistir matches ao vivo)
- [ ] Anti-cheat (validação server-side de todas as ações)
- [ ] Ranked matchmaking com ELO/MMR

## 🎮 Comparação com Jogos AAA

| Feature | Thorspace (Atual) | League of Legends | Status |
|---------|-------------------|-------------------|---------|
| Client Prediction | ❌ | ✅ | Roadmap Phase 2 |
| Server Authority | ✅ (Host) | ✅ (Dedicated) | ✅ Implementado |
| State Machine | ✅ (Simples) | ✅ (Complexa) | ✅ Implementado |
| Rollback/Reconciliation | ❌ | ✅ | Roadmap Phase 2 |
| WebSocket | ❌ (Realtime DB) | ✅ (Direto) | Roadmap Phase 2 |
| Latency | 150-500ms | 30-80ms | Limitado por Supabase |
| Tick Rate | ~1-2 Hz | 30-60 Hz | Limitado por Supabase |

## 📝 Conclusão

A arquitetura atual é **funcional e robusta para MVP**, mas tem limitações de performance inerentes ao uso de Postgres Realtime.

**Próximos passos críticos:**
1. ✅ Implementar State Machine (done)
2. ✅ Separar concerns de navegação e data (done)
3. 🚧 Adicionar metrics e monitoring
4. 🚧 Migrar para WebSockets puros quando escalar

**Quando migrar para WebSockets?**
- Quando tiver >100 concurrent players
- Quando latência for crítica para gameplay
- Quando precisar de tick rate >2 Hz

Por enquanto, a arquitetura está **bem estruturada para crescer** sem reescritas completas. 🎯
