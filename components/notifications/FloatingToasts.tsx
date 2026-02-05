"use client";
import { useRef } from "react";
import { useNotifications } from "./NotificationProvider";
import styles from "./FloatingToasts.module.css";

/* =========================
   Tipos
========================= */
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

  const timers = useRef<Record<string, NodeJS.Timeout>>({});
  const paused = useRef<Record<string, boolean>>({});

  const handleMouseEnter = (id: string) => {
    paused.current[id] = true;

    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  };

  const handleMouseLeave = (id: string) => {
    paused.current[id] = false;

    timers.current[id] = setTimeout(() => {
      dismissToast(id);
    }, 2000);
  };

  return (
    <div className={styles.toastStack} aria-live="polite">
      {toasts.map((toast, idx) => (
        <div
          key={toast.id}
          className={styles.toast}
          style={{
            animationDelay: `${idx * 0.08}s`,
            zIndex: 10030 + idx,
          }}
          onMouseEnter={() => handleMouseEnter(toast.id)}
          onMouseLeave={() => handleMouseLeave(toast.id)}
        >
          <div className={styles.toastContent}>
            <div className={styles.toastTitle}>{toast.title}</div>
            <div className={styles.toastMessage}>{toast.message}</div>
          </div>

          <button
            className={styles.toastClose}
            aria-label="Dismiss notification"
            onClick={() => dismissToast(toast.id)}
            type="button"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
