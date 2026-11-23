export const siteConfig = {
  profile: {
    firstName: "Durozen",
    lastName: "",
    displayName: "Durozen",
    tagline: "Crafting modern software, web platforms, \n and thoughtful user experiences",
    description: "Durozen crafts modern software, web platforms, and thoughtful user experiences.",
  },
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  socialLinks: {
    mastodon: "",
    twitter: "",
    letterboxd: "",
    dribbble: "",
    github: "",
    appleMusic: "",
  },
} as const;
