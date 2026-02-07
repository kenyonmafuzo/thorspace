/**
 * Match State Machine - Client-side state management for multiplayer matches
 * 
 * Inspirado em jogos AAA:
 * - Rocket League: Client prediction + server reconciliation
 * - League of Legends: State machine para match flow
 * - CS:GO: Separação clara entre game state e UI state
 * 
 * PRINCÍPIOS:
 * 1. Single Source of Truth (SSOT): Estado vive aqui
 * 2. Transições explícitas e validadas
 * 3. Side-effects isolados (callbacks)
 * 4. Imutabilidade de histórico
 * 5. Zero lógica de negócio em subscriptions
 */

// Estados válidos de um match multiplayer
export const MatchState = {
  IDLE: 'idle',                     // Antes de qualquer match
  INVITING: 'inviting',             // Convite enviado, aguardando
  INVITE_RECEIVED: 'invite_received', // Convite recebido
  LOADING: 'loading',               // Match aceito, carregando
  SHIP_SELECTION: 'ship_selection', // Selecionando naves
  BATTLE: 'battle',                 // Em combate
  FINISHED: 'finished',             // Match terminou
  RETURNING_TO_LOBBY: 'returning_to_lobby', // Voltando ao lobby
  ERROR: 'error'                    // Erro fatal
};

// Transições válidas (como um grafo dirigido)
const VALID_TRANSITIONS = {
  [MatchState.IDLE]: [MatchState.INVITING, MatchState.INVITE_RECEIVED],
  [MatchState.INVITING]: [MatchState.LOADING, MatchState.IDLE, MatchState.ERROR],
  [MatchState.INVITE_RECEIVED]: [MatchState.LOADING, MatchState.IDLE, MatchState.ERROR],
  [MatchState.LOADING]: [MatchState.SHIP_SELECTION, MatchState.ERROR],
  [MatchState.SHIP_SELECTION]: [MatchState.BATTLE, MatchState.ERROR],
  [MatchState.BATTLE]: [MatchState.FINISHED, MatchState.ERROR],
  [MatchState.FINISHED]: [MatchState.RETURNING_TO_LOBBY, MatchState.ERROR],
  [MatchState.RETURNING_TO_LOBBY]: [MatchState.IDLE],
  [MatchState.ERROR]: [MatchState.IDLE]
};

class MatchStateMachine {
  constructor() {
    this.currentState = MatchState.IDLE;
    this.history = [{ state: MatchState.IDLE, timestamp: Date.now() }];
    this.matchData = null;
    this.callbacks = {};
    
    // Debug mode (só em dev)
    this.debug = process.env.NODE_ENV === 'development';
  }

  /**
   * Transição de estado com validação
   * @param {string} newState - Próximo estado
   * @param {object} data - Dados contextuais
   * @returns {boolean} - true se transição foi válida
   */
  transition(newState, data = {}) {
    const validTransitions = VALID_TRANSITIONS[this.currentState] || [];
    
    // Validar transição
    if (!validTransitions.includes(newState)) {
      console.error(`[STATE MACHINE] ❌ Transição inválida: ${this.currentState} → ${newState}`);
      console.error('[STATE MACHINE] Transições válidas:', validTransitions);
      
      // Em produção, ignorar transições inválidas (fail-safe)
      if (process.env.NODE_ENV === 'production') {
        return false;
      }
      
      // Em dev, permitir mas alertar
      console.warn('[STATE MACHINE] ⚠️ Permitindo transição inválida em DEV mode');
    }

    const previousState = this.currentState;
    this.currentState = newState;
    
    // Registrar histórico
    this.history.push({
      state: newState,
      previousState,
      timestamp: Date.now(),
      data: { ...data }
    });
    
    // Limitar histórico a últimos 50 eventos
    if (this.history.length > 50) {
      this.history.shift();
    }
    
    if (this.debug) {
      console.log(`[STATE MACHINE] 🎮 ${previousState} → ${newState}`, data);
    }
    
    // Executar callbacks registrados
    this._executeCallbacks(newState, previousState, data);
    
    return true;
  }

  /**
   * Registrar callback para estado específico
   * @param {string} state - Estado a ouvir
   * @param {function} callback - Função a executar
   */
  on(state, callback) {
    if (!this.callbacks[state]) {
      this.callbacks[state] = [];
    }
    this.callbacks[state].push(callback);
  }

  /**
   * Remover callback
   */
  off(state, callback) {
    if (!this.callbacks[state]) return;
    this.callbacks[state] = this.callbacks[state].filter(cb => cb !== callback);
  }

  /**
   * Executar callbacks registrados
   */
  _executeCallbacks(newState, previousState, data) {
    const callbacks = this.callbacks[newState] || [];
    callbacks.forEach(cb => {
      try {
        cb({ newState, previousState, data });
      } catch (err) {
        console.error('[STATE MACHINE] Erro em callback:', err);
      }
    });
  }

  /**
   * Checar se estado atual é X
   */
  is(state) {
    return this.currentState === state;
  }

  /**
   * Checar se pode transicionar para X
   */
  canTransitionTo(state) {
    const validTransitions = VALID_TRANSITIONS[this.currentState] || [];
    return validTransitions.includes(state);
  }

  /**
   * Resetar state machine
   */
  reset() {
    this.currentState = MatchState.IDLE;
    this.matchData = null;
    this.history = [{ state: MatchState.IDLE, timestamp: Date.now() }];
    
    if (this.debug) {
      console.log('[STATE MACHINE] 🔄 Reset para IDLE');
    }
  }

  /**
   * Obter histórico de estados (útil para debug)
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Dump do estado atual (debug)
   */
  dump() {
    return {
      currentState: this.currentState,
      matchData: this.matchData,
      history: this.getHistory(),
      validNextStates: VALID_TRANSITIONS[this.currentState] || []
    };
  }
}

// Singleton global
let instance = null;

export function getMatchStateMachine() {
  if (!instance) {
    instance = new MatchStateMachine();
  }
  return instance;
}

export function resetMatchStateMachine() {
  if (instance) {
    instance.reset();
  }
}
