"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

export const defaultToastDuration = 4000;

export function useAdminToast(autoDismissDelay: number = defaultToastDuration) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const existingTimeout = timeoutsRef.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current.clear();
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", duration: number = autoDismissDelay) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, type, message: trimmed };

      // Keep recent toast without cluttering the corner
      setToasts([newToast]);

      // Clear any prior timeouts
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current.clear();

      if (duration > 0) {
        const timeout = setTimeout(() => {
          dismissToast(id);
        }, duration);
        timeoutsRef.current.set(id, timeout);
      }
    },
    [autoDismissDelay, dismissToast],
  );

  const showSuccess = useCallback(
    (message: string, duration?: number) => showToast(message, "success", duration),
    [showToast],
  );

  const showError = useCallback(
    (message: string, duration?: number) => showToast(message, "error", duration),
    [showToast],
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => showToast(message, "warning", duration),
    [showToast],
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => showToast(message, "info", duration),
    [showToast],
  );

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissToast,
    clearAllToasts,
  };
}
