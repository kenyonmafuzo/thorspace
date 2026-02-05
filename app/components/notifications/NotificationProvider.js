"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const NotificationsContext = createContext(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return ctx;
}

export default function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((toast = {}) => {
    const id =
      toast.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const next = {
      id,
      title: toast.title ?? "Notification",
      message: toast.message ?? "",
      type: toast.type ?? "info", // opcional
      createdAt: toast.createdAt ?? new Date().toISOString(),
      durationMs: toast.durationMs ?? 2000, // opcional
    };

    // Limite: 3 toasts (mais novo em cima)
    setToasts((prev) => [next, ...prev].slice(0, 3));
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => setToasts([]), []);

  const value = useMemo(
    () => ({ toasts, pushToast, dismissToast, clearAll }),
    [toasts, pushToast, dismissToast, clearAll]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
