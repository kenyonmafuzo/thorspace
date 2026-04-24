"use client";
import { useState, useEffect, useCallback } from "react";

/**
 * useGuest — manages the guest session flag in localStorage.
 * A guest is a user who clicked "Entrar como visitante" and has no Supabase auth.
 */
export function useGuest() {
  const [isGuest, setIsGuest] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("thor_guest") === "1";
  });

  const enterGuest = useCallback(() => {
    localStorage.setItem("thor_guest", "1");
    setIsGuest(true);
  }, []);

  const exitGuest = useCallback(() => {
    localStorage.removeItem("thor_guest");
    setIsGuest(false);
  }, []);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "thor_guest") {
        setIsGuest(e.newValue === "1");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { isGuest, enterGuest, exitGuest };
}
