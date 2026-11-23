import type { Metadata, Viewport } from "next";
import { SiteInteractions } from "@/components/SiteInteractions";
import { siteConfig } from "@/data/siteConfig";
import "@/styles/generated/styles.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: `${siteConfig.profile.displayName} — Portfolio`,
    template: `%s | ${siteConfig.profile.displayName}`,
  },
  description: siteConfig.profile.description,
  authors: [{ name: siteConfig.profile.displayName }],
  openGraph: {
    title: `${siteConfig.profile.displayName} — Portfolio`,
    description: siteConfig.profile.description,
    type: "website",
    url: siteConfig.siteUrl,
  },
  twitter: {
    card: "summary",
    title: `${siteConfig.profile.displayName} — Portfolio`,
    description: siteConfig.profile.description,
  },
  icons: {
    icon: [{ url: "/assets/favicon.png", type: "image/png", sizes: "500x500" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "rgb(255 255 255)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <SiteInteractions />
      </body>
    </html>
  );
}
