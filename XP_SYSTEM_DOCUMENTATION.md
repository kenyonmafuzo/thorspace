# Sistema de XP e Ranks - Documentação

## ✅ IMPLEMENTADO - Passo 1: Core Loop XP + Levels

### Arquivos Criados

1. **`/lib/xpSystem.js`** - Core do sistema de ranks
   - 21 níveis (7 tiers × 3 subtiers)
   - Tabela LEVELS com XP necessário para cada nível
   - Funções: `computeMatchXp()`, `getLevelFromTotalXp()`, `getRankAssetKey()`, `formatRankDisplay()`

2. **`/app/components/RankBadge.js`** - Componente React para exibir rank
   - Mostra ícone do rank (512x512px)
   - Tooltip com progresso (tier + material + XP)
   - Hover/click para exibir detalhes

3. **`/supabase/migrations/20260109_add_total_xp_column.sql`** - Migration
   - Adiciona coluna `total_xp` à tabela `player_progress`
   - Total XP nunca diminui (apenas cresce)
   - Index para queries otimizadas

4. **`/public/images/ranks/README.md`** - Estrutura de assets
   - Diretórios criados para 7 tiers
   - Especificações: PNG 512x512px, fundo transparente
   - Total: 21 ícones (rookie_bronze.png, etc.)

### Arquivos Modificados

1. **`/public/game/thor.html`**
   - ✅ Eventos negativos zerados (não subtraem XP)
   - ✅ CAP HARD de 450 XP aplicado em `processMatchEndXPEvents()`
   - ✅ XP nunca diminui (sempre >= 0)

2. **`/lib/progress.js`**
   - ✅ Import `getLevelFromTotalXp` do xpSystem
   - ✅ `getOrCreateProgress()` agora busca `total_xp`
   - ✅ Nova função `applyTotalXpGain()` para sistema de ranks
   - ✅ Total XP separado do XP de level up (sistema antigo mantido)

3. **`/lib/match.js`**
   - ✅ Import `applyTotalXpGain` do progress
   - ✅ Chama `applyTotalXpGain()` após `applyXpGain()`
   - ✅ Ambos sistemas funcionam em paralelo (antigo + novo)

4. **`/app/components/UserHeader.js`**
   - ✅ Import `RankBadge` component
   - ✅ State `totalXp` adicionado
   - ✅ Fetch `total_xp` do banco
   - ✅ Exibe `<RankBadge totalXp={totalXp} size={48} />` no header
   - ✅ LevelXPBadge mantido (sistema antigo preservado)

---

## Regras de XP Implementadas

### ✅ XP Nunca Diminui
- Todos os eventos negativos agora valem **0 XP**
- `FRIENDLY_COLLISION`, `ENEMY_COLLISION`, `LOSE_ONE_SHIP`, etc. = **0**
- Total XP (`total_xp`) só cresce

### ✅ CAP HARD de 450 XP
```javascript
// Aplicado em processMatchEndXPEvents()
xpTotalMatch = Math.min(450, Math.max(0, xpTotalMatch));
```

### Eventos Positivos (mantidos)
| Evento | XP |
|--------|-----|
| DESTROY_ENEMY_SHIP | +25 |
| PRECISION_HIT_STREAK | +20 |
| DOUBLE_KILL_ROUND | +40 |
| TRIPLE_KILL_ROUND | +80 |
| PERFECT_ROUND | +30 |
| CLUTCH_KILL | +25 |
| COMEBACK_WIN | +20 |
| MATCH_VICTORY | +30 |
| MATCH_DRAW | +20 |
| MATCH_DEFEAT | +10 |

---

## Curva de Levels (21 níveis)

### Tiers e Materiais
- **Tiers**: Rookie, Veteran, Elite, Pro, Master, Grandmaster, Legendary
- **Materiais**: 1=Bronze, 2=Silver, 3=Gold

### Tabela Completa
| LevelID | Tier | Material | XP to Next |
|---------|------|----------|------------|
| 1 | Rookie | Bronze | 1,000 |
| 2 | Rookie | Silver | 1,400 |
| 3 | Rookie | Gold | 2,000 |
| 4 | Veteran | Bronze | 2,800 |
| 5 | Veteran | Silver | 3,800 |
| 6 | Veteran | Gold | 5,200 |
| 7 | Elite | Bronze | 7,200 |
| 8 | Elite | Silver | 10,000 |
| 9 | Elite | Gold | 14,000 |
| 10 | Pro | Bronze | 19,000 |
| 11 | Pro | Silver | 26,000 |
| 12 | Pro | Gold | 35,000 |
| 13 | Master | Bronze | 47,000 |
| 14 | Master | Silver | 62,000 |
| 15 | Master | Gold | 82,000 |
| 16 | Grandmaster | Bronze | 110,000 |
| 17 | Grandmaster | Silver | 145,000 |
| 18 | Grandmaster | Gold | 260,000 |
| 19 | Legendary | Bronze | 360,000 |
| 20 | Legendary | Silver | 520,000 |
| 21 | Legendary | Gold | ∞ (max) |

---

## Integração no Fluxo do Jogo

### 1. thor.html (Cálculo)
```javascript
// No final da partida
processMatchEndXPEvents(result);
// CAP aplicado automaticamente
// xpTotalMatch agora é <= 450 e >= 0
```

### 2. game/page.js (Bridge)
```javascript
// Recebe xpGained do GAME_OVER
const { xpGained } = payload;
// Passa para match.js
await finalizeMatch({ ..., xpGained });
```

### 3. lib/match.js (Persistência)
```javascript
// Aplica XP no sistema antigo (level ups)
await applyXpGain({ userId, xpGain: finalXpGained });

// Aplica Total XP no sistema novo (ranks)
await applyTotalXpGain({ userId, xpGain: finalXpGained });
```

### 4. lib/progress.js (Database)
```javascript
// applyTotalXpGain() atualiza player_progress.total_xp
// XP nunca diminui: newTotalXp = currentTotalXp + xpGain
```

### 5. UserHeader.js (UI)
```javascript
// Fetch total_xp do banco
const { total_xp } = progressData;
setTotalXp(total_xp);

// Render
<RankBadge totalXp={totalXp} size={48} />
```

---

## UI/HUD

### Header (UserHeader.js)
- ✅ **RankBadge**: Ícone do rank (tier + material)
- ✅ **Tooltip**: Hover mostra "Tier — Material", "XP: X / Y", barra de progresso
- ✅ **LevelXPBadge**: Sistema antigo mantido (números internos)

### Exemplo de Exibição
```
[🏆 Rank Icon]  LV 5  [Username]
    ↓ Hover
"Rookie — Silver"
"XP: 750 / 1,400"
[▓▓▓▓▓░░░░░] 53%
```

---

## Persistência

### Database (Supabase)
- **Tabela**: `player_progress`
- **Colunas**:
  - `level` - Sistema antigo (level ups)
  - `xp` - XP dentro do level atual
  - `xp_to_next` - XP necessário para próximo level
  - `total_xp` - **NOVO**: XP acumulado total (nunca diminui)

### Migration
```sql
ALTER TABLE player_progress
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_player_progress_total_xp 
ON player_progress(total_xp DESC);
```

---

## Testes Rápidos

### Console (thor.html ou Dev Tools)
```javascript
// Importar funções
import { testXpSystem } from '@/lib/xpSystem';

// Rodar testes
testXpSystem();

// Output esperado:
// Teste 1 (CAP 450): 450 ✅
// Teste 2 (500 XP): { levelId: 1, tier: "Rookie", subTier: 1 } ✅
// Teste 3 (1000 XP): { levelId: 2, tier: "Rookie", subTier: 2 } ✅
// Teste 4 (Max XP): { levelId: 21, tier: "Legendary", subTier: 3 } ✅
```

### Testes Manuais
1. Jogar partida → Verificar CAP de 450 XP
2. Total XP nunca diminui após derrotas
3. Transição Rookie I → Rookie II em ~1000 XP total
4. Rank badge atualiza após partida
5. Tooltip mostra progresso correto

---

## Assets de Rank

### Estrutura (IMPORTANTE)
```
/public/images/ranks/
├── rookie/
│   ├── rookie_bronze.png
│   ├── rookie_silver.png
│   └── rookie_gold.png
├── veteran/...
├── elite/...
├── pro/...
├── master/...
├── grandmaster/...
└── legendary/...
```

### Especificações
- **Formato**: PNG com transparência
- **Tamanho**: 512x512 px
- **Total**: 21 arquivos
- **Naming**: `{tier}_{material}.png` (lowercase)

### getRankAssetKey()
```javascript
// Retorna path completo
getRankAssetKey("Rookie", 1) 
// → "/images/ranks/rookie/rookie_bronze.png"
```

---

## Garantias

### ✅ Não Quebra Fluxo Atual
- Sistema antigo (level, xp, xp_to_next) mantido intacto
- Login, seleção de nave, multiplayer não afetados
- Ambos sistemas funcionam em paralelo

### ✅ XP Nunca Diminui
- Eventos negativos = 0
- total_xp só cresce
- CAP de 450 por partida

### ✅ Rank Baseado em Total XP
- 21 níveis fixos
- Tier + Material calculados automaticamente
- Overflow tratado (fixa no Legendary Gold)

---

## Próximos Passos (Opcional)

1. **Assets**: Adicionar os 21 ícones PNG
2. **Ranking Page**: Mostrar ranks na tabela de ranking
3. **Profile Page**: Exibir rank no perfil do jogador
4. **Animações**: Level up animation quando sobe de tier/material
5. **Notificações**: Toast quando alcança novo rank
6. **Badges**: Adicionar badges especiais para marcos (primeira vitória, 100 partidas, etc.)

---

## Estrutura de Código

```
lib/
├── xpSystem.js          ← CORE (21 levels, funções principais)
├── progress.js          ← PERSISTÊNCIA (total_xp, ranks)
└── match.js             ← INTEGRAÇÃO (aplica XP)

app/components/
├── RankBadge.js         ← UI (badge + tooltip)
└── UserHeader.js        ← HEADER (exibe rank)

public/
└── game/
    └── thor.html        ← GAME (XP events, CAP 450)

supabase/migrations/
└── 20260109_add_total_xp_column.sql  ← DB (total_xp column)
```

---

## Resumo Final

✅ **XP nunca diminui**  
✅ **CAP de 450 XP por partida**  
✅ **21 níveis (7 tiers × 3 materiais)**  
✅ **Rank badge no header**  
✅ **Tooltip com progresso**  
✅ **Persistência em total_xp**  
✅ **Sistema antigo mantido**  
✅ **Fluxo atual não quebrado**  

**Status**: PRONTO PARA TESTES! 🚀
