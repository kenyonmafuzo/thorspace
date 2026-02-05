"use client";

import { useEffect } from "react";
import { startPresence, stopPresence } from "@/lib/presence";

/**
 * PresenceBridge - Integração do Presence System
 * Componente client-only que gerencia o ciclo de vida do sistema de presença
 * 
 * - Mount: inicia presence (online + heartbeat)
 * - Unmount: para presence e limpa timers
 * - Não renderiza nada
 */
export default function PresenceBridge() {
  useEffect(() => {
    // Inicia o sistema de presença quando o componente monta
    startPresence();

    // Cleanup: para o sistema quando o componente desmonta
    return () => {
      stopPresence();
    };
  }, []);

  // Não renderiza nada
  return null;
}
