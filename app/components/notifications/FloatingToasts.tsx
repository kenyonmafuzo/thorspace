"use client";

import { useRef } from "react";
import { useNotifications } from "./NotificationProvider";

type Toast = {
  id: string;
  title: string;
  message: string;
};

export default function FloatingToasts() {
  const { toasts, dismissToast } = useNotifications() as {
    toasts: Toast[];
    dismissToast: (id: string) => void;
  };

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const paused = useRef<Record<string, boolean>>({});

  const handleMouseEnter = (id: string) => {
    paused.current[id] = true;
    const t = timers.current[id];
    if (t) {
      clearTimeout(t);
      delete timers.current[id];
    }
  };

  const handleMouseLeave = (id: string) => {
    paused.current[id] = false;
    timers.current[id] = setTimeout(() => dismissToast(id), 2000);
  };

  // Diagnóstico: log do objeto toast
  toasts.forEach((toast) => {
    console.log('[FloatingToasts] Toast:', toast);
  });
  // Função utilitária para interpolação segura
  function formatNotifText(notif, t) {
    let meta = notif.meta;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { meta = {}; }
    }
    const translation = t && notif.type ? t(`inbox.${notif.type}`, meta || {}) : undefined;
    let content;
    if (notif.type && translation && !translation.startsWith('inbox.') && translation !== notif.type) {
      content = translation;
    } else if (notif.message) {
      content = notif.message;
    } else {
      content = '';
    }
    if (content && content.includes('{username}') && meta && typeof meta.username === 'string') {
      content = content.replaceAll('{username}', meta.username || 'Alguém');
    }
    return content;
  }
  // Importa hook de tradução
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { t } = require("@/src/hooks/useI18n");
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 10000 }}>
      {toasts.map((toast, idx) => (
        <div
          key={toast.id}
          style={{
            marginBottom: 8,
            padding: 12,
            background: "#111",
            color: "#fff",
            borderRadius: 8,
            minWidth: 260,
            animationDelay: `${idx * 0.08}s`,
          }}
          onMouseEnter={() => handleMouseEnter(toast.id)}
          onMouseLeave={() => handleMouseLeave(toast.id)}
        >
          <strong>{toast.title}</strong>
          <div>{formatNotifText(toast, t && t())}</div>
          <button onClick={() => dismissToast(toast.id)} style={{ marginTop: 6 }}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
