import {
  homeSections,
  projectSectionIds,
} from "@/data/homeSections";
import { PortfolioSection } from "@/components/PortfolioSection";
import {
  getHomepageProjects,
  getProjectAssetUrl,
  type Project,
} from "@/lib/projects-api";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInlineDescription(value: string): string {
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let result = "";
  let cursor = 0;

  for (const match of value.matchAll(linkPattern)) {
    const index = match.index ?? 0;
    result += escapeHtml(value.slice(cursor, index));
    result += `<a href="${escapeHtml(match[2])}" target="_blank">${escapeHtml(match[1])}</a>`;
    cursor = index + match[0].length;
  }

  return result + escapeHtml(value.slice(cursor));
}

type ProjectPortraitTiltClass =
  | "project-portrait-tilt-left"
  | "project-portrait-tilt-right";

function addProjectSectionClass(
  markup: string,
  tiltClass?: ProjectPortraitTiltClass,
): string {
  const modifier = tiltClass ? ` ${tiltClass}` : "";
  return markup.replace(
    /(<div class="section)(?=\s)/,
    `$1 portfolio-project-section${modifier}`,
  );
}

function getProjectLinkLabel(project: Project): string {
  return /(?:^|\/\/)apps\.apple\.com(?:\/|$)/i.test(project.projectLink)
    ? "Download on the App Store"
    : `Visit ${project.projectName}`;
}

function applyProjectData(
  markup: string,
  project: Project,
  prioritizeBackgroundImage: boolean,
  projectPosition: number,
): string {
  const tiltClass = projectPosition % 2 === 0
    ? "project-portrait-tilt-left"
    : "project-portrait-tilt-right";
  let updated = addProjectSectionClass(markup, tiltClass).replace(
    /(<h2><span class="timestamp">)[\s\S]*?(<\/span><br>)[\s\S]*?(<\/h2>)/,
    (_match, prefix: string, separator: string, suffix: string) =>
      `${prefix}${escapeHtml(project.projectType)}${separator}${escapeHtml(project.projectName)}${suffix}`,
  );

  const descriptionMarkup = project.description
    .split(/\n{2,}/)
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p>${paragraph
          .split("\n")
          .map((line) => renderInlineDescription(line))
          .join("<br>")}</p>`,
    )
    .join("");

  const showcaseStart = updated.indexOf('<div class="showcase');
  if (showcaseStart < 0) {
    throw new Error(`Project section for "${project.projectName}" has no showcase.`);
  }
  let descriptionInserted = false;
  const content = updated.slice(0, showcaseStart).replace(
    /<p>[\s\S]*?<\/p>/g,
    (paragraph) => {
      if (paragraph.includes('class="external-link')) return paragraph;
      if (descriptionInserted) return "";
      descriptionInserted = true;
      return descriptionMarkup;
    },
  );
  if (!descriptionInserted) {
    throw new Error(`Project section for "${project.projectName}" has no description.`);
  }
  const remainingContent = updated.slice(showcaseStart);
  updated = content + remainingContent;

  const projectLinkMarkup = project.projectLink
    ? `<a href="${escapeHtml(project.projectLink)}" target="_blank" rel="noopener noreferrer" class="external-link project-link">${escapeHtml(getProjectLinkLabel(project))}</a>`
    : "";
  let linkInserted = false;
  updated = updated.replace(
    /<a\b(?=[^>]*class="external-link tint-color")[^>]*>[\s\S]*?<\/a>/g,
    () => {
      if (!projectLinkMarkup || linkInserted) return "";
      linkInserted = true;
      return projectLinkMarkup;
    },
  );
  updated = updated.replace(/<p>\s*<\/p>/g, "");

  if (projectLinkMarkup && !linkInserted) {
    const showcaseStart = updated.indexOf('<div class="showcase');
    const contentClose = updated.slice(0, showcaseStart).lastIndexOf("</div>");
    if (showcaseStart < 0 || contentClose < 0) {
      throw new Error(`Project section for "${project.projectName}" has no content area.`);
    }
    updated =
      updated.slice(0, contentClose) +
      projectLinkMarkup +
      updated.slice(contentClose);
  }

  const projectImagesMarkup = project.images
    .slice(0, 1)
    .map((image) => {
      const imageUrl = getProjectAssetUrl(image);
      return `<img class="project-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(project.projectName)}" />`;
    })
    .join("");
  updated = updated.replace(
    /<div class="showcase[^"]*">[\s\S]*?<\/div>/,
    () =>
      `<div class="showcase${project.images.length ? " project-showcase" : ""}">${projectImagesMarkup}</div>`,
  );

  if (project.backgroundImage) {
    const backgroundImageUrl = getProjectAssetUrl(project.backgroundImage);
    const sectionStart = updated.indexOf('<div class="section');
    const sectionEnd = updated.indexOf(">", sectionStart);
    if (sectionStart < 0 || sectionEnd < 0) {
      throw new Error(`Project section for "${project.projectName}" has no section root.`);
    }

    const sectionOpeningTag = updated
      .slice(sectionStart, sectionEnd + 1)
      .replace('class="section', 'class="section project-with-background');
    updated =
      updated.slice(0, sectionStart) +
      sectionOpeningTag +
      `<div class="project-background"${prioritizeBackgroundImage ? ' data-priority="high"' : ""} aria-hidden="true"><img src="${escapeHtml(backgroundImageUrl)}" alt="" /></div>` +
      updated.slice(sectionEnd + 1);
  }

  return updated;
}

export async function HomeSections() {
  let homepageProjects: (Project | null)[];
  try {
    homepageProjects = await getHomepageProjects();
  } catch (error) {
    console.warn(
      "Portfolio projects could not be loaded from the API; project sections are left empty.",
      error,
    );
    return homeSections.map((section) => (
      <PortfolioSection
        key={section.id}
        markup={
          projectSectionIds.has(section.id)
            ? addProjectSectionClass(section.markup)
            : section.markup
        }
      />
    ));
  }

  let projectPosition = 0;
  return homeSections.flatMap((section) => {
    if (projectSectionIds.has(section.id)) {
      const position = projectPosition++;
      const project = homepageProjects[position];
      if (project === undefined) {
        throw new Error("Homepage API returned fewer projects than available layouts.");
      }
      if (project === null) {
        return [
          <PortfolioSection
            key={section.id}
            markup={addProjectSectionClass(section.markup)}
          />,
        ];
      }
      return [
        <PortfolioSection
          key={project.id}
          markup={applyProjectData(
            section.markup,
            project,
            position === 0,
            position,
          )}
        />,
      ];
    }
    return [
      <PortfolioSection
        key={section.id}
        markup={section.markup}
      />,
    ];
  });
}
