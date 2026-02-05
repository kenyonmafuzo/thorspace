# Guia de Uso do Sistema de Eventos

## 📡 Como Usar os Eventos para Sincronizar Ações

Este guia mostra como implementar a lógica de tiros e movimentos usando o sistema de eventos.

---

## 1. Exemplo: Enviar Movimento

Quando o jogador move uma nave, envie um evento:

```javascript
async function moveShip(shipIndex, fromX, fromY, toX, toY) {
  // 1. Executar movimento localmente (imediato)
  const ship = myShips[shipIndex];
  ship.x = toX;
  ship.y = toY;
  
  // 2. Enviar evento para sincronizar com oponente
  await sendMatchEvent('move', {
    shipIndex: shipIndex,
    fromX: fromX,
    fromY: fromY,
    toX: toX,
    toY: toY,
    timestamp: Date.now()
  });
  
  console.log('[GAME] Movimento enviado');
}
```

**No oponente:**
```javascript
function applyOpponentMove(payload) {
  const { shipIndex, fromX, fromY, toX, toY } = payload;
  
  console.log('[EVENTS] Oponente moveu nave', shipIndex, 'de', fromX, fromY, 'para', toX, toY);
  
  // Obter nave do oponente
  const opponentShip = enemyShips[shipIndex];
  
  if (!opponentShip) {
    console.error('[EVENTS] Nave do oponente não encontrada:', shipIndex);
    return;
  }
  
  // Animar movimento (smooth transition)
  animateShipMovement(opponentShip, fromX, fromY, toX, toY, 500); // 500ms
  
  // Atualizar posição final
  opponentShip.x = toX;
  opponentShip.y = toY;
}

function animateShipMovement(ship, fromX, fromY, toX, toY, duration) {
  const startTime = Date.now();
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing: ease-in-out
    const eased = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    ship.x = fromX + deltaX * eased;
    ship.y = fromY + deltaY * eased;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  animate();
}
```

---

## 2. Exemplo: Enviar Tiro

Quando o jogador atira:

```javascript
async function shootWeapon(shipIndex, targetX, targetY, weaponType) {
  // 1. Criar projétil localmente
  const ship = myShips[shipIndex];
  const projectile = createProjectile(ship.x, ship.y, targetX, targetY, weaponType);
  projectiles.push(projectile);
  
  // 2. Enviar evento
  await sendMatchEvent('shoot', {
    shipIndex: shipIndex,
    fromX: ship.x,
    fromY: ship.y,
    targetX: targetX,
    targetY: targetY,
    weaponType: weaponType,
    timestamp: Date.now()
  });
  
  console.log('[GAME] Tiro enviado');
}
```

**No oponente:**
```javascript
function applyOpponentShoot(payload) {
  const { shipIndex, fromX, fromY, targetX, targetY, weaponType } = payload;
  
  console.log('[EVENTS] Oponente atirou:', weaponType, 'de', fromX, fromY, 'para', targetX, targetY);
  
  // Criar projétil visual
  const projectile = createProjectile(fromX, fromY, targetX, targetY, weaponType);
  projectiles.push(projectile);
  
  // Som do tiro (opcional)
  playSoundEffect('laser_shoot');
}

function createProjectile(fromX, fromY, targetX, targetY, weaponType) {
  return {
    x: fromX,
    y: fromY,
    targetX: targetX,
    targetY: targetY,
    speed: 5,
    type: weaponType,
    active: true,
    startTime: Date.now()
  };
}
```

---

## 3. Exemplo: Aplicar Dano

Quando um projétil acerta:

```javascript
function checkProjectileHit(projectile) {
  // Verificar colisão com naves inimigas
  for (let i = 0; i < enemyShips.length; i++) {
    const enemy = enemyShips[i];
    
    if (isColliding(projectile, enemy)) {
      // Calcular dano
      const damage = calculateDamage(projectile.type, enemy.armor);
      enemy.health -= damage;
      
      // Verificar se foi destruída
      const isDestroyed = enemy.health <= 0;
      
      // Enviar evento de dano
      sendMatchEvent('damage', {
        targetShipIndex: i,
        damage: damage,
        remainingHealth: enemy.health,
        isDestroyed: isDestroyed,
        timestamp: Date.now()
      });
      
      // Efeito visual local
      showExplosion(enemy.x, enemy.y, isDestroyed);
      
      // Desativar projétil
      projectile.active = false;
      
      return true;
    }
  }
  
  return false;
}
```

**No oponente:**
```javascript
function applyDamage(payload) {
  const { targetShipIndex, damage, remainingHealth, isDestroyed } = payload;
  
  console.log('[EVENTS] Minha nave', targetShipIndex, 'recebeu', damage, 'de dano');
  
  // Obter minha nave
  const myShip = myShips[targetShipIndex];
  
  if (!myShip) {
    console.error('[EVENTS] Minha nave não encontrada:', targetShipIndex);
    return;
  }
  
  // Atualizar saúde (usar valor do servidor como fonte de verdade)
  myShip.health = remainingHealth;
  
  // Efeito visual
  showDamageEffect(myShip.x, myShip.y);
  showExplosion(myShip.x, myShip.y, isDestroyed);
  
  // Som
  playSoundEffect(isDestroyed ? 'ship_destroyed' : 'ship_hit');
  
  // Se destruída, marcar como inativa
  if (isDestroyed) {
    myShip.active = false;
    myShip.destroyed = true;
    
    // Animação de destruição
    animateShipDestruction(myShip);
  }
  
  // Atualizar HUD
  updateHealthBar(targetShipIndex, remainingHealth);
}
```

---

## 4. Integração com o Game Loop

```javascript
function gameLoop() {
  // ... código existente ...
  
  // Atualizar projéteis
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    
    if (!proj.active) {
      projectiles.splice(i, 1);
      continue;
    }
    
    // Mover projétil
    moveProjectile(proj);
    
    // Verificar colisões (só para MEUS projéteis)
    if (proj.ownerId === myUserId) {
      checkProjectileHit(proj);
    }
    
    // Renderizar
    drawProjectile(proj);
  }
  
  // ... continuar loop ...
  requestAnimationFrame(gameLoop);
}
```

---

## 5. Exemplo: Estrutura de Payload

### Movimento:
```json
{
  "shipIndex": 0,
  "fromX": 100,
  "fromY": 200,
  "toX": 150,
  "toY": 250,
  "timestamp": 1704571234567
}
```

### Tiro:
```json
{
  "shipIndex": 1,
  "fromX": 150,
  "fromY": 250,
  "targetX": 300,
  "targetY": 400,
  "weaponType": "laser",
  "timestamp": 1704571234568
}
```

### Dano:
```json
{
  "targetShipIndex": 2,
  "damage": 25,
  "remainingHealth": 75,
  "isDestroyed": false,
  "timestamp": 1704571234569
}
```

---

## 6. Boas Práticas

### ✅ DO:
- Execute ações localmente imediatamente (responsiveness)
- Envie eventos para sincronizar com oponente
- Use `timestamp` para debug/ordenação
- Ignore eventos com `user_id === myUserId` (já executou localmente)
- Use DB como fonte de verdade para valores críticos (saúde, posição)

### ❌ DON'T:
- Não espere resposta do evento para executar localmente (lag)
- Não confie apenas em estado local (sincronização)
- Não envie eventos redundantes (performance)
- Não processe seus próprios eventos (duplicação)

---

## 7. Debug

### Logs úteis:
```javascript
// No envio
console.log('[EVENTS] 📤 Enviando:', type, payload);

// No recebimento
console.log('[EVENTS] 📨 Recebido:', event.type, event.payload);
console.log('[EVENTS] User:', event.user_id, '(eu:', myUserId + ')');

// Após aplicar
console.log('[EVENTS] ✅ Aplicado:', type);
```

### Verificar no Supabase:
```sql
-- Ver últimos eventos
SELECT * FROM match_events 
WHERE match_id = 'seu-match-id' 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver eventos por tipo
SELECT type, COUNT(*) 
FROM match_events 
WHERE match_id = 'seu-match-id' 
GROUP BY type;
```

---

## 8. Performance

### Otimizações:
- **Batch events**: Agrupe múltiplos eventos pequenos se possível
- **Rate limiting**: Não envie mais de 10 eventos/segundo
- **Compressão**: Use payloads compactos (números em vez de strings longas)
- **TTL**: Limpe eventos antigos periodicamente

```sql
-- Limpar eventos antigos (executar periodicamente)
DELETE FROM match_events 
WHERE created_at < NOW() - INTERVAL '1 day';
```

---

## 9. Segurança

### Validação no Cliente:
```javascript
function applyOpponentShoot(payload) {
  // Validar payload
  if (!payload.targetX || !payload.targetY) {
    console.error('[EVENTS] Payload inválido:', payload);
    return;
  }
  
  // Validar bounds
  if (payload.targetX < 0 || payload.targetX > GAME_WIDTH) {
    console.error('[EVENTS] Coordenadas inválidas');
    return;
  }
  
  // Aplicar ação
  // ...
}
```

### RLS no Supabase (já implementado):
- Só participantes podem inserir eventos
- Só participantes podem ler eventos
- `user_id` é automaticamente setado via `auth.uid()`

---

## 10. Testes

```javascript
// Teste: Enviar movimento
await sendMatchEvent('move', {
  shipIndex: 0,
  fromX: 100,
  fromY: 100,
  toX: 200,
  toY: 200,
  timestamp: Date.now()
});

// Verificar no console do outro cliente:
// [EVENTS] 📨 Evento recebido: { type: 'move', ... }
// [EVENTS] 🚀 Reproduzindo movimento do oponente
```

---

## 📚 Recursos

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [MULTIPLAYER_CHANGES_SUMMARY.md](./MULTIPLAYER_CHANGES_SUMMARY.md)
- [MULTIPLAYER_SCHEMA_UPDATES.md](./MULTIPLAYER_SCHEMA_UPDATES.md)
