import Link from "next/link";
import { SiteNavigation } from "@/components/SiteNavigation";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <div className={styles.page}>
      <header className={styles.siteHeader}>
        <SiteNavigation />
      </header>

      <main id="main-content" className={styles.main}>
        <section className={styles.message} aria-labelledby="not-found-heading">
          <p className={styles.eyebrow}>404 — Page not found</p>
          <h1 id="not-found-heading">We couldn’t find that page.</h1>
          <p className={styles.description}>
            The page may have moved or the address may be incorrect.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/">
              Back to home
            </Link>
            <Link className={styles.secondaryAction} href="/projects">
              Explore our projects
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
