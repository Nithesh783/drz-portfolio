export interface Project {
  id: string;
  projectType: string;
  projectName: string;
  description: string;
  projectLink: string;
  images: string[];
  backgroundImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getBrowserApiBaseUrl(): string {
  return "/api/backend";
}

export function getProjectAssetUrl(src: string): string {
  if (!src || src.startsWith("/") || /^https?:\/\//i.test(src)) return src;
  return `/media?key=${encodeURIComponent(src)}`;
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== "object") return false;
  const project = value as Record<string, unknown>;
  return (
    typeof project.id === "string" &&
    typeof project.projectType === "string" &&
    typeof project.projectName === "string" &&
    typeof project.description === "string" &&
    typeof project.projectLink === "string" &&
    Array.isArray(project.images) &&
    project.images.length <= 2 &&
    project.images.every((image) => typeof image === "string") &&
    (project.backgroundImage === undefined ||
      project.backgroundImage === null ||
      typeof project.backgroundImage === "string") &&
    typeof project.createdAt === "string" &&
    typeof project.updatedAt === "string"
  );
}

export function parseProjects(value: unknown): Project[] {
  if (!Array.isArray(value) || !value.every(isProject)) {
    throw new Error("Projects API returned an invalid project list.");
  }
  return value.map((project) => ({
    ...project,
    images: project.images.slice(-1),
    backgroundImage:
      typeof project.backgroundImage === "string"
        ? project.backgroundImage
        : null,
  }));
}

export function parseHomepageProjects(value: unknown): (Project | null)[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "Homepage projects API returned an invalid project list.",
    );
  }
  const homepageSlots =
    value.length === 9 && value.every(isProject) ? value.slice(1) : value;
  if (
    homepageSlots.length !== 8 ||
    !homepageSlots.every((project) => project === null || isProject(project))
  ) {
    throw new Error(
      `Homepage projects API returned ${homepageSlots.length} slots; expected 8.`,
    );
  }
  return homepageSlots.map((project) => {
    if (project === null) return null;
    const parsedProject = parseProjects([project])[0];
    if (!parsedProject) {
      throw new Error("Homepage projects API returned an invalid project slot.");
    }
    return parsedProject;
  });
}

export async function getProjects(): Promise<Project[]> {
  const apiBaseUrl =
    process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiBaseUrl.replace(/\/+$/, "")}/projects`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Projects API returned HTTP ${response.status}.`);
  }

  return parseProjects(await response.json());
}

export async function getHomepageProjects(): Promise<(Project | null)[]> {
  const apiBaseUrl =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000";
  const response = await fetch(
    `${apiBaseUrl.replace(/\/+$/, "")}/projects/homepage`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`Homepage projects API returned HTTP ${response.status}.`);
  }

  return parseHomepageProjects(await response.json());
}
