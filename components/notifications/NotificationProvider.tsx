"use client";
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";

export type Toast = {
  id: string;
  title: string;
  message: string;
  createdAt: number;
};

type NotificationContextType = {
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, "id" | "createdAt">) => void;
  dismissToast: (id: string) => void;
  clearAll: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<{ [id: string]: NodeJS.Timeout }>({});

  // Push toast (max 3)
  const pushToast = useCallback(({ title, message }: { title: string; message: string }) => {
    setToasts((prev) => {
      const id = Math.random().toString(36).slice(2) + Date.now();
      const newToast: Toast = { id, title, message, createdAt: Date.now() };
      let next = [newToast, ...prev];
      if (next.length > 3) next = next.slice(0, 3);
      return next;
    });
  }, []);

  // Dismiss toast
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    setToasts([]);
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
  }, []);

  // Auto-dismiss logic
  useEffect(() => {
    toasts.forEach((toast) => {
      if (!timers.current[toast.id]) {
        timers.current[toast.id] = setTimeout(() => {
          dismissToast(toast.id);
        }, 6000);
      }
    });
    // Cleanup removed toasts
    Object.keys(timers.current).forEach((id) => {
      if (!toasts.find((t) => t.id === id)) {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
      }
    });
  }, [toasts, dismissToast]);

  return (
    <NotificationContext.Provider value={{ toasts, pushToast, dismissToast, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
