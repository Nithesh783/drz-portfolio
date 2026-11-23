"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAdminToast } from "@/hooks/useAdminToast";
import { AdminToast } from "@/components/AdminToast";
import { adminDashboardHref } from "@/lib/admin-tabs";
import styles from "./AdminLogin.module.css";

export function AdminLoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const { toasts, showError, dismissToast, clearAllToasts } = useAdminToast();
  const [submitting, setSubmitting] = useState(false);
  const [fallbackErrorVisible, setFallbackErrorVisible] = useState(Boolean(initialError));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFallbackErrorVisible(false);
    clearAllToasts();
    setSubmitting(true);
    const form = event.currentTarget;
    const values = new FormData(form);

    try {
      const response = await fetch("/api/admin/auth/login/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(values.get("email") ?? "").trim(),
          password: String(values.get("password") ?? ""),
        }),
      });
      if (!response.ok) {
        const result: unknown = await response.json();
        const errorMessage =
          result && typeof result === "object" && "message" in result
            ? result.message
            : null;
        throw new Error(
          typeof errorMessage === "string"
            ? errorMessage
            : `Login API returned HTTP ${response.status}.`,
        );
      }

      router.replace(adminDashboardHref);
    } catch (reason) {
      showError(
        reason instanceof Error ? reason.message : "Unable to sign in.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AdminToast toasts={toasts} onDismiss={dismissToast} />
      {fallbackErrorVisible && initialError && (
        <p className={styles.error} role="alert">
          {initialError}
        </p>
      )}
      <form
        method="post"
        action="/api/admin/auth/login/"
        onSubmit={submit}
        className={styles.form}
      >
        <label className={styles.field}>
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            placeholder="admin@example.com"
          />
        </label>
        <label className={styles.field}>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={12}
            maxLength={200}
            placeholder="Enter your password"
          />
        </label>
        <button className={styles.submitButton} type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in to workspace"}
          {!submitting && <span aria-hidden="true">→</span>}
        </button>
      </form>
    </>
  );
}
