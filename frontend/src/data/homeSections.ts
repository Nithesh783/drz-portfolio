export type HomeSectionData = { id: string; markup: string };

const allHomeSections: HomeSectionData[] = [
  {
    "id": "big-hero-six",
    "markup": `<div class="section big-hero-six" data-theme-color="rgb(255, 255, 255)">
      <nav class="hero-navigation" aria-label="Main navigation">
        <a href="/">HOME</a>
        <a href="/projects">OUR PROJECTS</a>
        <a href="/contact">CONTACT</a>
      </nav>
      <div class="background" aria-hidden="true"><img class="hero-building" src="/assets/about-building.png" alt="" width="1026" height="1500" fetchPriority="high" /></div>
      <div class="main-content-wrapper"><div class="content"><p><a class="ninja-links" target="_blank">Hi, Welcome</a></p><h1>__PROFILE_FIRST__<span id="unecessary-part-of-name">__PROFILE_LAST__</span></h1><p>__PROFILE_TAGLINE__</p></div></div>
      <div class="custom-wave" aria-hidden="true"><svg class="custom-wave-art" viewBox="0 0 4323 250" xmlns="http://www.w3.org/2000/svg"><path d="M4323 149.091C4158.477 100.525 3983.713 186.994 3657.89 202.614C3114.29 226.291 3014.707 40.8657 2524.355 4.04682C2059.081 -27.5776 1419.787 135.797 921.126 159.38C405.132 182.963 0 128.418 0 128.418V250H4323C4323 250 4323 27.5687 4323 149.091Z" fill="#0D0D0D"/></svg></div>
    </div>`
  },
  {
    "id": "about-us",
    "markup": "<div class=\"section retro about-us-section\" data-theme-color=\"rgb(13, 13, 13)\" aria-labelledby=\"about-us-heading\"><div class=\"main-content-wrapper\"><div class=\"content\"><h2 id=\"about-us-heading\">About Us</h2><p>We are a creative technology company turning ideas into meaningful digital experiences. From modern websites to powerful software solutions, we build products that help businesses grow and move forward.</p><a href=\"https://www.durozen.in/\" target=\"_blank\" class=\"external-link tint-color\">Visit us</a></div></div><svg class=\"wave wave-bottom\" width=\"4323\" height=\"250\" viewBox=\"0 0 4323 250\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M4323 149.091C4091.5 100.525 3848.5 186.994 3412 202.614C2750.36 226.291 2638.5 40.8657 2124.5 4.04682C1683.02 -27.5776 1127.5 135.797 721 159.38C314.504 182.963 0 128.418 0 128.418V250H4323C4323 250 4323 27.5687 4323 149.091Z\"/></svg></div>"
  },
  {
    "id": "homepage-project-1",
    "markup": "<div class=\"section handmirror\" data-theme-color=\"rgb(234, 233, 234)\"><div class=\"main-content-wrapper\"><div class=\"content\"><h2><span class=\"timestamp\"></span><br></h2><p></p></div><div class=\"showcase\"></div></div><svg class=\"wave wave-bottom\" width=\"4323\" height=\"700\" viewBox=\"0 0 4323 700\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M4323 34.5566C4323 252.392 4225.5 548.808 3509.5 548.808C3135 548.808 3153.5 368.696 2564.5 393C2119.77 411.351 1139.99 506.534 733.498 548.808C327.002 591.082 0 561.739 0 561.739V700H4323C4323 700 4323 -183.279 4323 34.5566Z\" fill=\"#fcfcfc\"/></svg></div>"
  },
  {
    "id": "homepage-project-2",
    "markup": "<div class=\"section knightnight\" data-theme-color=\"rgb(0, 0, 0)\"><div class=\"main-content-wrapper\"><div class=\"content\"><h2><span class=\"timestamp\"></span><br></h2><p></p></div><div class=\"showcase\"></div></div><svg class=\"wave wave-bottom\" width=\"4323\" height=\"250\" viewBox=\"0 0 4323 250\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M4323 149.091C4091.5 100.525 3848.5 186.994 3412 202.614C2750.36 226.291 2638.5 40.8657 2124.5 4.04682C1683.02 -27.5776 1127.5 135.797 721 159.38C314.504 182.963 0 128.418 0 128.418V250H4323C4323 250 4323 27.5687 4323 149.091Z\"/></svg></div>"
  },
  {
    "id": "homepage-project-3",
    "markup": "<div class=\"section sketch\" data-theme-color=\"rgb(255, 160, 0)\"><div class=\"main-content-wrapper\"><div class=\"content\"><h2><span class=\"timestamp\"></span><br></h2><p></p></div><div class=\"showcase\"></div></div><svg class=\"wave wave-bottom\" width=\"4323\" height=\"250\" viewBox=\"0 0 4323 250\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M4323 149.091C4091.5 100.525 3848.5 186.994 3412 202.614C2750.36 226.291 2638.5 40.8657 2124.5 4.04682C1683.02 -27.5776 1127.5 135.797 721 159.38C314.504 182.963 0 128.418 0 128.418V250H4323C4323 250 4323 27.5687 4323 149.091Z\"/></svg></div>"
  },
  {
    "id": "homepage-project-4",
    "markup": "<div class=\"section thwip\" data-theme-color=\"rgb(6, 6, 6)\"><div class=\"main-content-wrapper\"><div class=\"content\"><h2><span class=\"timestamp\"></span><br></h2><p></p></div><div class=\"showcase\"></div></div><svg class=\"wave wave-bottom\" width=\"4323\" height=\"700\" viewBox=\"0 0 4323 700\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M4.72978e-08 34.5567C-0.00398254 252.392 251.499 426.462 957.999 515.983C2043 640.319 1870.5 376.296 2459.5 400.6C2904.23 418.951 3183 506.534 3589.5 548.808C3996 591.082 4323 561.739 4323 561.739V700H4.72978e-08C4.72978e-08 700 0.00398264 -183.279 4.72978e-08 34.5567Z\" fill=\"white\"/></svg></div>"
  },
  {
    "id": "homepage-project-5",
    "markup": "<div class=\"section spatialty-coffee\" data-theme-color=\"rgb(222, 193, 154)\"><div class=\"main-content-wrapper\"><div class=\"content\"><h2><span class=\"timestamp\"></span><br></h2><p></p></div><div class=\"showcase\"></div></div><svg class=\"wave wave-bottom\" width=\"4324\" height=\"202\" viewBox=\"0 0 4324 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M0.996094 202V80.4186C0.996094 80.4186 202 -52.0911 743 24.5C1284 101.091 1884 24.5 2624 24.5C3364 24.5 4324 101.091 4324 101.091C4324 101.091 4324 202 4324 202H0.996094Z\" fill=\"white\"/></svg></div>"
  },
  {
    "id": "homepage-project-6",
    "markup": "<div class=\"section docktor\" data-theme-color=\"rgb(48, 24, 0)\"><div class=\"main-content-wrapper\"><div class=\"content\"><h2><span class=\"timestamp\"></span><br></h2><p></p></div><div class=\"showcase\"></div></div><svg class=\"wave wave-bottom\" width=\"4323\" height=\"250\" viewBox=\"0 0 4323 250\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M4323 149.091C4091.5 100.525 3848.5 186.994 3412 202.614C2750.36 226.291 2638.5 40.8657 2124.5 4.04682C1683.02 -27.5776 1127.5 135.797 721 159.38C314.504 182.963 0 128.418 0 128.418V250H4323C4323 250 4323 27.5687 4323 149.091Z\"/></svg></div>"
  },
  {
    "id": "homepage-project-7",
    "markup": "<div class=\"section hidock\" data-theme-color=\"rgb(222, 0, 228)\"><div class=\"main-content-wrapper\"><div class=\"content\"><h2><span class=\"timestamp\"></span><br></h2><p></p></div><div class=\"showcase\"></div></div><svg class=\"wave wave-bottom\" width=\"4324\" height=\"202\" viewBox=\"0 0 4324 202\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M0.996094 202V80.4186C0.996094 80.4186 202 -52.0911 743 24.5C1284 101.091 1884 24.5 2624 24.5C3364 24.5 4324 101.091 4324 101.091C4324 101.091 4324 202 4324 202H0.996094Z\" fill=\"white\"/></svg></div>"
  },
  {
    "id": "homepage-project-8",
    "markup": "<div class=\"section along\" data-theme-color=\"rgb(13, 13, 13)\"><div class=\"main-content-wrapper\"><div class=\"content\"><h2><span class=\"timestamp\"></span><br></h2><p></p></div><div class=\"showcase\"></div></div><svg class=\"wave wave-bottom\" width=\"4323\" height=\"250\" viewBox=\"0 0 4323 250\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M4323 149.091C4091.5 100.525 3848.5 186.994 3412 202.614C2750.36 226.291 2638.5 40.8657 2124.5 4.04682C1683.02 -27.5776 1127.5 135.797 721 159.38C314.504 182.963 0 128.418 0 128.418V250H4323C4323 250 4323 27.5687 4323 149.091Z\" fill=\"white\"/></svg></div>"
  },
];

export const projectSectionIds = new Set([
  "homepage-project-1",
  "homepage-project-2",
  "homepage-project-3",
  "homepage-project-4",
  "homepage-project-5",
  "homepage-project-6",
  "homepage-project-7",
  "homepage-project-8",
]);

export const homeSections = allHomeSections;
