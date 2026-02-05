"use client";

import React, { createContext, useContext, useMemo } from "react";

/**
 * Contexto simples para não quebrar o build.
 * Se você já tiver um provider real em outro lugar, depois a gente conecta.
 */

const ProgressContext = createContext({
  xp: 0,
  tier: null,
  loading: false,
  refresh: async () => {},
});

export function ProgressProvider({ children, value }) {
  // Permite você passar {xp, tier, loading, refresh} por props
  const ctxValue = useMemo(() => {
    return {
      xp: value?.xp ?? 0,
      tier: value?.tier ?? null,
      loading: value?.loading ?? false,
      refresh: value?.refresh ?? (async () => {}),
    };
  }, [value]);

  return (
    <ProgressContext.Provider value={ctxValue}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  return useContext(ProgressContext);
}
