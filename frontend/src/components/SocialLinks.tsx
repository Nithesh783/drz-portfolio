const socialLinks = [
  {
    id: "instagram",
    name: "Instagram",
    href: "https://www.instagram.com/durozen_technologies/",
    ariaLabel: "Durozen Technologies on Instagram",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          fill="none"
          stroke="#E1306C"
          strokeWidth="2"
        />
        <circle
          cx="12"
          cy="12"
          r="4"
          fill="none"
          stroke="#E1306C"
          strokeWidth="2"
        />
        <circle cx="18" cy="6" r="1.2" fill="#E1306C" />
      </svg>
    ),
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/durozen-technologies/",
    ariaLabel: "Durozen Technologies on LinkedIn",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#0A66C2" />
        <text
          x="5"
          y="17"
          fill="white"
          fontFamily="Arial, sans-serif"
          fontSize="13"
          fontWeight="700"
        >
          in
        </text>
      </svg>
    ),
  },
  {
    id: "facebook",
    name: "Facebook",
    href: "https://www.facebook.com/share/1e8uYVEax4/",
    ariaLabel: "Durozen Technologies on Facebook",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="10" fill="#1877F2" />
        <path
          fill="white"
          d="M13.5 20v-7h2.3l.4-2.7h-2.7V8.6c0-.8.3-1.3 1.4-1.3h1.4V4.9c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v1.6H8v2.7h2.2v7z"
        />
      </svg>
    ),
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    href: "https://wa.me/918122339694",
    ariaLabel: "Message Durozen Technologies on WhatsApp",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="#25D366"
          d="M12 2a10 10 0 0 0-8.66 14.99L2 22l5.2-1.36A10 10 0 1 0 12 2Z"
        />
        <path
          fill="white"
          d="M16.8 14.4c-.26-.13-1.54-.76-1.78-.85-.24-.09-.41-.13-.58.13-.17.26-.67.85-.82 1.02-.15.17-.3.19-.56.06-.26-.13-1.1-.41-2.1-1.3-.78-.69-1.31-1.54-1.46-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.58-1.4-.8-1.92-.21-.5-.42-.43-.58-.44-.15-.01-.32-.01-.49-.01-.17 0-.45.06-.69.32-.24.26-.9.88-.9 2.15s.92 2.49 1.05 2.66c.13.17 1.81 2.76 4.39 3.87.61.26 1.09.42 1.46.54.61.19 1.17.16 1.61.1.49-.07 1.54-.63 1.76-1.24.22-.61.22-1.13.15-1.24-.06-.11-.23-.17-.49-.3Z"
        />
      </svg>
    ),
  },
];

export function SocialLinks() {
  return (
    <section
      className="section miscelanious-is-a-funny-word"
      aria-labelledby="social-links-heading"
    >
      <div className="main-content-wrapper social">
        <div className="content">
          <h3 id="social-links-heading">Follow us on the internet</h3>
          <ul className="social-links">
            {socialLinks.map((link) => (
              <li key={link.id} className={link.id}>
                <div className="social-entry">
                  <a
                    className="social-icon-link"
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.ariaLabel}
                  >
                    <span className="social-icon">{link.icon}</span>
                  </a>
                  <div className="social-content">
                    <a
                      className="social-name-link"
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <h4 className="social-name">{link.name}</h4>
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
