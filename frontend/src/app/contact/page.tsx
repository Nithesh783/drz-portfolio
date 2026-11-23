import type { Metadata } from "next";
import Link from "next/link";
import { EnquiryForm } from "@/components/EnquiryForm";
import { SiteNavigation } from "@/components/SiteNavigation";
import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send a portfolio enquiry.",
};

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <header className={styles.siteHeader}>
        <SiteNavigation activePath="/contact" />
      </header>

      <main className={styles.main}>
        <section className={styles.contactCard} aria-label="Contact Durozen">
          <div className={styles.introPanel}>
            <div className={styles.routePattern} aria-hidden="true">
              <span className={styles.routePin} />
              <span className={styles.routeNode} />
            </div>
            <div className={styles.introContent}>
              <p className={styles.eyebrow}>Contact Durozen</p>
              <h1>Let’s build something meaningful.</h1>
              <p className={styles.introText}>
                Have a project, collaboration, or idea in mind? Tell us a little
                about it and we’ll take it from there.
              </p>
              <Link className={styles.projectsLink} href="/projects">
                Explore our projects <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className={styles.introFooter}>
              <span className={styles.footerMark} aria-hidden="true">D</span>
              <p>
                Crafting modern software, web platforms, and thoughtful
                experiences.
              </p>
            </div>
          </div>

          <section className={styles.formPanel} aria-labelledby="contact-heading">
            <p className={styles.eyebrow}>Start a conversation</p>
            <h2 id="contact-heading">Tell us about your project</h2>
            <p className={styles.formIntro}>
              Share a few details and we’ll get the conversation started.
            </p>
            <EnquiryForm />
          </section>
        </section>
      </main>
    </div>
  );
}
