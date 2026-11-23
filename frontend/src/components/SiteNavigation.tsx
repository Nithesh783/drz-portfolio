import Link from "next/link";
import styles from "./SiteNavigation.module.css";

const links = [
  { href: "/", label: "HOME" },
  { href: "/projects", label: "OUR PROJECTS" },
  { href: "/contact", label: "CONTACT" },
] as const;

type SiteNavigationProps = {
  activePath?: (typeof links)[number]["href"];
};

export function SiteNavigation({ activePath }: SiteNavigationProps) {
  return (
    <nav className={styles.navigation} aria-label="Main navigation">
      {links.map(({ href, label }) => (
        <Link
          href={href}
          aria-current={activePath === href ? "page" : undefined}
          key={href}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
