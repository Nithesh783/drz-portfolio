import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteNavigation } from "@/components/SiteNavigation";
import {
  getProjectAssetUrl,
  getProjects,
  type Project,
} from "@/lib/projects-api";
import styles from "./projects.module.css";

export const metadata: Metadata = {
  title: "Projects",
  description: "Explore Durozen's portfolio projects.",
};

type ProjectsPageProps = {
  searchParams: Promise<{ page?: string | string[]; q?: string | string[] }>;
};

const desktopProjectsPerPage = 20;
const mobileProjectsPerPage = 10;

function descriptionText(description: string): string {
  return description.replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, "$1");
}

function ProjectCard({
  project,
  originalIndex,
}: {
  project: Project;
  originalIndex: number;
}) {
  const logoTones = [
    styles.logoYellow,
    styles.logoDark,
    styles.logoMint,
    styles.logoBlue,
  ];
  const tone = logoTones[originalIndex % logoTones.length];
  const previewImage = project.backgroundImage ?? project.images[0];

  return (
    <article className={styles.projectCard}>
      <div className={styles.projectPreview}>
        {previewImage ? (
          <Image
            src={getProjectAssetUrl(previewImage)}
            alt=""
            aria-hidden="true"
            width={640}
            height={360}
            unoptimized
          />
        ) : (
          <span className={`${styles.projectPreviewFallback} ${tone}`} aria-hidden="true">
            {project.projectName.trim().charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className={styles.projectHeader}>
        <div className={styles.projectIdentity}>
          <h2>{project.projectName}</h2>
          <p>{project.projectType}</p>
        </div>
      </div>

      <div className={styles.cardDivider} />
      <p className={styles.projectDescription}>
        {descriptionText(project.description)}
      </p>

      {project.projectLink && (
        <a
          className={styles.projectLink}
          href={project.projectLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit project <span aria-hidden="true">↗</span>
        </a>
      )}
    </article>
  );
}

function ProjectGrid({
  projects,
  allProjects,
}: {
  projects: Project[];
  allProjects: Project[];
}) {
  return (
    <section className={styles.projectGrid} aria-label="All projects">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          originalIndex={allProjects.findIndex((item) => item.id === project.id)}
        />
      ))}
    </section>
  );
}

function projectsPageHref(page: number, query: string): string {
  const searchParams = new URLSearchParams();
  if (query) searchParams.set("q", query);
  searchParams.set("page", String(page));
  return `/projects?${searchParams.toString()}`;
}

function ProjectPagination({
  currentPage,
  pageCount,
  query,
}: {
  currentPage: number;
  pageCount: number;
  query: string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav className={styles.pagination} aria-label="Project pages">
      {currentPage > 1 ? (
        <Link
          className={styles.pageLink}
          href={projectsPageHref(currentPage - 1, query)}
        >
          Previous
        </Link>
      ) : (
        <span
          className={`${styles.pageLink} ${styles.pageDisabled}`}
          aria-disabled="true"
        >
          Previous
        </span>
      )}

      <div className={styles.pageNumbers}>
        {Array.from({ length: pageCount }, (_, index) => {
          const page = index + 1;

          return (
            <Link
              className={styles.pageLink}
              href={projectsPageHref(page, query)}
              aria-current={page === currentPage ? "page" : undefined}
              key={page}
            >
              {page}
            </Link>
          );
        })}
      </div>

      {currentPage < pageCount ? (
        <Link
          className={styles.pageLink}
          href={projectsPageHref(currentPage + 1, query)}
        >
          Next
        </Link>
      ) : (
        <span
          className={`${styles.pageLink} ${styles.pageDisabled}`}
          aria-disabled="true"
        >
          Next
        </span>
      )}
    </nav>
  );
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const [projects, params] = await Promise.all([getProjects(), searchParams]);
  const query = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  const searchTerm = query.trim().toLowerCase();
  const filteredProjects = projects.filter((project) =>
    [project.projectName, project.projectType, project.description]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm),
  );
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const requestedPage = Number(pageValue);
  const requestedPageNumber =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const desktopPageCount = Math.ceil(
    filteredProjects.length / desktopProjectsPerPage,
  );
  const mobilePageCount = Math.ceil(
    filteredProjects.length / mobileProjectsPerPage,
  );
  const desktopCurrentPage = Math.min(
    requestedPageNumber,
    Math.max(desktopPageCount, 1),
  );
  const mobileCurrentPage = Math.min(
    requestedPageNumber,
    Math.max(mobilePageCount, 1),
  );
  const desktopProjects = filteredProjects.slice(
    (desktopCurrentPage - 1) * desktopProjectsPerPage,
    desktopCurrentPage * desktopProjectsPerPage,
  );
  const mobileProjects = filteredProjects.slice(
    (mobileCurrentPage - 1) * mobileProjectsPerPage,
    mobileCurrentPage * mobileProjectsPerPage,
  );

  return (
    <div className={styles.page}>
      <header className={styles.siteHeader}>
        <SiteNavigation activePath="/projects" />
      </header>

      <main className={styles.main}>
        <div className={styles.sectionHeading}>
          <div className={styles.headingTitle}>
            <h1>Our Projects</h1>
            <p className={styles.resultCount}>
              <strong>{filteredProjects.length}</strong>
              <span> / {projects.length} projects</span>
            </p>
          </div>
          <form action="/projects" className={styles.searchForm} role="search">
            <label className={styles.visuallyHidden} htmlFor="project-search">
              Search projects
            </label>
            <svg
              className={styles.searchIcon}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              id="project-search"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search projects"
            />
            <button type="submit">Search</button>
          </form>
        </div>

        {query && (
          <p className={styles.searchSummary}>
            Results for <strong>“{query}”</strong>
          </p>
        )}

        {filteredProjects.length ? (
          <>
            <div className={styles.desktopProjects}>
              <ProjectGrid projects={desktopProjects} allProjects={projects} />
              <ProjectPagination
                currentPage={desktopCurrentPage}
                pageCount={desktopPageCount}
                query={query}
              />
            </div>
            <div className={styles.mobileProjects}>
              <ProjectGrid projects={mobileProjects} allProjects={projects} />
              <ProjectPagination
                currentPage={mobileCurrentPage}
                pageCount={mobilePageCount}
                query={query}
              />
            </div>
          </>
        ) : (
          <p className={styles.emptyState}>
            {projects.length === 0
              ? "No projects have been added yet."
              : `No projects match “${query}”. Try another search.`}
          </p>
        )}
      </main>
    </div>
  );
}
