import { siteConfig } from "@/data/siteConfig";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHeroFirstName(value: string): string {
  if (value !== "Durozen") return escapeHtml(value);

  return [
    '<span class="hero-name-red">D</span>',
    '<span class="hero-name-yellow">ur</span>',
    '<span class="hero-name-green">oz</span>',
    '<span class="hero-name-blue">en</span>',
  ].join("");
}

const socialLabels = {
  mastodon: "Mastodon",
  twitter: "Twitter",
  letterboxd: "Letterboxd",
  dribbble: "Dribbble",
  github: "GitHub",
  appleMusic: "Apple Music",
} as const;

export function resolvePortfolioMarkup(markup: string): string {
  let resolved = markup
    .replace(/<div class="main-content-wrapper footer">[\s\S]*?<\/div>/, "")
    .replace(
      /<div class="main-content-wrapper people-id-like-to-meet">[\s\S]*?<\/div><\/div>/,
      "",
    )
    .replaceAll("__PROFILE_FIRST__", renderHeroFirstName(siteConfig.profile.firstName))
    .replaceAll("__PROFILE_LAST__", escapeHtml(siteConfig.profile.lastName))
    .replaceAll(
      "__PROFILE_TAGLINE__",
      escapeHtml(siteConfig.profile.tagline).replaceAll("\n", "<br>"),
    );

  for (const [key, label] of Object.entries(socialLabels)) {
    const url = siteConfig.socialLinks[key as keyof typeof siteConfig.socialLinks];
    const placeholder = `__PROFILE_SOCIAL_${key.replace(/[A-Z]/g, (letter) => `_${letter.toUpperCase()}`)}__`;

    if (url) {
      resolved = resolved.replaceAll(placeholder, escapeHtml(url));
      continue;
    }

    const pattern = new RegExp(`<a\\b[^>]*href="${placeholder}"[^>]*><\\/a>`, "g");
    resolved = resolved.replace(
      pattern,
      `<span class="whole-thang-is-a-target" aria-hidden="true" data-unconfigured-social="${label}"></span>`,
    );
  }

  return resolved;
}
