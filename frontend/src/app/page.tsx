import { HomeSections } from "@/sections/HomeSections";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <main id="main-content" tabIndex={-1}>
        <div className="papa-wrapper">
          <HomeSections />
        </div>
      </main>
    </>
  );
}
