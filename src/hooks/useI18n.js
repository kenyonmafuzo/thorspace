"use client";

import { useEffect, useState, useCallback } from "react";
import { getDictionary } from "@/src/i18n";

export function useI18n() {
  const [lang, setLang] = useState("pt");
  const [dict, setDict] = useState(getDictionary("pt"));

  const updateLanguage = useCallback(() => {
    try {
      const stored = localStorage.getItem("thor_settings_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        const newLang = parsed?.ui?.language || "pt";
        setLang(newLang);
        setDict(getDictionary(newLang));
      }
    } catch (e) {
      setLang("pt");
      setDict(getDictionary("pt"));
    }
  }, []);

  useEffect(() => {
    updateLanguage();
  }, [updateLanguage]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "thor_settings_v1") {
        updateLanguage();
      }
    };

    const handleLangChanged = () => {
      updateLanguage();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("THOR:LANG_CHANGED", handleLangChanged);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("THOR:LANG_CHANGED", handleLangChanged);
    };
  }, [updateLanguage]);

  const t = (key, varsOrFallback = key, fallback) => {
    let vars = {};
    if (typeof varsOrFallback === "object" && varsOrFallback !== null && !Array.isArray(varsOrFallback)) {
      vars = varsOrFallback;
    } else if (typeof varsOrFallback === "string") {
      fallback = varsOrFallback;
    }
    const keys = key.split(".");
    let current = dict;
    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        return fallback || key;
      }
    }
    if (typeof current === "string") {
      // Interpolação de variáveis
      return current.replace(/\{(\w+)\}/g, (_, v) => (vars[v] !== undefined ? vars[v] : `{${v}}`));
    }
    return current || fallback || key;
  };

  return { lang, t };
}
