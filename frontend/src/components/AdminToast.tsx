"use client";

import React from "react";
import type { ToastItem } from "@/hooks/useAdminToast";
import styles from "./AdminToast.module.css";

interface AdminToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  placement?: "top" | "bottom";
}

export function AdminToast({
  toasts,
  onDismiss,
  placement = "top",
}: AdminToastProps) {
  if (!toasts.length) return null;

  return (
    <aside
      className={`${styles.toastContainer} ${placement === "bottom" ? styles.bottom : ""}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type] ?? styles.info}`}
          role={toast.type === "error" ? "alert" : "status"}
        >
          <span className={styles.toastMessage}>{toast.message}</span>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ))}
    </aside>
  );
}
