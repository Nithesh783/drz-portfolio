import parse, {
  attributesToProps,
  Element,
  Text,
  type HTMLReactParserOptions,
} from "html-react-parser";
import {
  cloneElement,
  createElement,
  isValidElement,
  type ReactElement,
} from "react";
import { PortfolioVideo } from "@/components/PortfolioVideo";
import { ProjectBackground } from "@/components/ProjectBackground";

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function hasClass(element: Element, name: string): boolean {
  return element.attribs.class?.split(/\s+/).includes(name) ?? false;
}

function findDescendant(
  element: Element,
  predicate: (candidate: Element) => boolean,
): Element | undefined {
  for (const child of element.children) {
    if (!(child instanceof Element)) continue;
    if (predicate(child)) return child;
    const descendant = findDescendant(child, predicate);
    if (descendant) return descendant;
  }
}

function findAncestor(
  element: Element,
  predicate: (candidate: Element) => boolean,
): Element | undefined {
  let parent = element.parent;
  while (parent) {
    if (parent instanceof Element && predicate(parent)) return parent;
    parent = parent.parent;
  }
}

function getTextContent(node: Element | Text, omitTimestamp = false): string {
  if (node instanceof Text) return node.data;
  if (omitTimestamp && hasClass(node, "timestamp")) return "";
  return node.children
    .map((child) =>
      child instanceof Element || child instanceof Text
        ? getTextContent(child, omitTimestamp)
        : "",
    )
    .join("");
}

function describeCardLink(link: Element): string {
  const listItem = findAncestor(link, (element) => element.name === "li");
  const listHeading =
    listItem && findDescendant(listItem, (element) => element.name === "h4");
  if (listHeading) return cleanText(getTextContent(listHeading));

  const hasAlt = (element: Element) => element.name === "img" && Boolean(element.attribs.alt);
  const image =
    findDescendant(link, hasAlt) ??
    (link.parent instanceof Element ? findDescendant(link.parent, hasAlt) : undefined);
  if (image?.attribs.alt) return cleanText(image.attribs.alt);

  const section = findAncestor(
    link,
    (element) => hasClass(element, "section") || hasClass(element, "main-content-wrapper"),
  );
  const content =
    section && findDescendant(section, (element) => hasClass(element, "content"));
  const heading =
    content &&
    findDescendant(content, (element) => element.name === "h2" || element.name === "h3");
  if (heading) {
    const text = cleanText(getTextContent(heading, true));
    if (text) return text;
  }

  return link.attribs.href?.endsWith(".mp4") ? "Open video" : "Open link";
}

export const portfolioHtmlParserOptions: HTMLReactParserOptions = {
  replace(domNode) {
    if (!(domNode instanceof Element)) return;
    if (domNode.name === "div" && hasClass(domNode, "project-background")) {
      const image = findDescendant(domNode, (element) => element.name === "img");
      if (!image?.attribs.src) {
        throw new Error("Project background is missing its image source.");
      }
      return createElement(ProjectBackground, {
        src: image.attribs.src,
        priority: domNode.attribs["data-priority"] === "high",
      });
    }

    const isProjectImage =
      domNode.name === "img" &&
      hasClass(domNode, "project-image") &&
      findAncestor(domNode, (element) => hasClass(element, "project-showcase"));
    if (
      (domNode.name === "img" || domNode.name === "video") &&
      findAncestor(domNode, (element) => hasClass(element, "showcase")) &&
      !isProjectImage
    ) {
      return null;
    }
    if (domNode.name !== "video") return;

    const videoSource = domNode.attribs["data-video-src"];
    if (!videoSource) return;

    const props = attributesToProps(domNode.attribs, domNode.name);
    delete props.autoPlay;
    return createElement(PortfolioVideo, {
      ...props,
      "data-video-src": videoSource,
      "data-allow-motion": domNode.attribs["data-allow-motion"],
    });
  },
  transform(reactNode, domNode) {
    if (!isValidElement(reactNode)) {
      return typeof reactNode === "string" || reactNode === null ? reactNode : undefined;
    }
    if (!(domNode instanceof Element)) return reactNode;

    const props: Record<string, unknown> = {};
    let modified = false;

    if (domNode.name === "a") {
      if (domNode.attribs.target === "_blank") {
        const relValues = new Set((domNode.attribs.rel ?? "").split(/\s+/).filter(Boolean));
        relValues.add("noopener");
        relValues.add("noreferrer");
        props.rel = Array.from(relValues).join(" ");
        modified = true;
      }

      if (
        hasClass(domNode, "whole-thang-is-a-target") &&
        !domNode.attribs["aria-label"] &&
        !cleanText(getTextContent(domNode))
      ) {
        props["aria-label"] = describeCardLink(domNode);
        modified = true;
      }
    }

    if (domNode.name === "svg" && hasClass(domNode, "wave")) {
      props["aria-hidden"] = true;
      props.focusable = "false";
      modified = true;
    }

    if (domNode.name === "video") {
      if (!("controls" in domNode.attribs)) {
        props["aria-hidden"] = true;
        props.tabIndex = "-1";
        modified = true;
      }
      if (findAncestor(domNode, (element) => hasClass(element, "big-hero-six"))) {
        props.autoPlay = undefined;
        modified = true;
      }
    }

    if (hasClass(domNode, "tick") || domNode.attribs.id === "easterNope") {
      props["aria-hidden"] = true;
      modified = true;
    }

    if (!modified) return reactNode;
    return cloneElement(
      reactNode as ReactElement<Record<string, unknown>>,
      props,
    );
  },
};

export function parsePortfolioHtml(markup: string) {
  return parse(markup, portfolioHtmlParserOptions);
}
