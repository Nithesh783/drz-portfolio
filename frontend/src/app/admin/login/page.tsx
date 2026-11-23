import type { Metadata } from "next";
import Link from "next/link";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import styles from "@/components/AdminLogin.module.css";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

function getLoginError(error: string | string[] | undefined): string | undefined {
  if (error === "invalid_credentials") {
    return "Email or password is incorrect.";
  }
  if (error === "invalid_request") {
    return "Check your email and password and try again.";
  }
  if (error === "unavailable") {
    return "Admin authentication service is unavailable. Please try again.";
  }
  return undefined;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error } = await searchParams;

  return (
    <main className={styles.page}>
      <section className={styles.layout}>
        <aside className={styles.intro}>
          <Link className={styles.brand} href="/">
            <span className={styles.brandMark} aria-hidden="true">D</span>
            <span>
              <strong>Durozen</strong>
              <small>PORTFOLIO STUDIO</small>
            </span>
          </Link>
          <div className={styles.introCopy}>
            <span className={styles.eyebrow}>PRIVATE WORKSPACE</span>
            <h1>Make good work happen.</h1>
            <p>One place to keep your projects polished and every enquiry moving.</p>
          </div>
          <Link href="/" className={styles.backLink}>
            <svg
              className={styles.backArrow}
              viewBox="0 0 16 16"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M14 8H3m0 0 5-5m-5 5 5 5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
              />
            </svg>
            <span>Back to portfolio</span>
          </Link>
          <div className={styles.decorCircle} aria-hidden="true" />
        </aside>

        <div className={styles.loginPanel}>
          <div className={styles.loginCard}>
            <span className={styles.eyebrow}>ADMIN ACCESS</span>
            <h2>Welcome back</h2>
            <p className={styles.subtitle}>Sign in to manage your portfolio workspace.</p>
            <AdminLoginForm initialError={getLoginError(error)} />
            <p className={styles.securityNote}>
              <span aria-hidden="true">⌑</span>
              Secure access for portfolio administrators
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
