"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

type ProjectBackgroundProps = {
  src: string;
  priority: boolean;
};

type FadeStyle = CSSProperties & {
  "--project-background-fade-start"?: string;
  "--project-background-fade-middle"?: string;
  "--project-background-fade-end"?: string;
  "--project-background-fade-top"?: string;
  "--project-background-fade-bottom"?: string;
  "--project-background-aspect-ratio"?: string;
};

type BackgroundFade = {
  start: number;
  middle: number;
  end: number;
  top: number;
  bottom: number;
};

export function ProjectBackground({ src, priority }: ProjectBackgroundProps) {
  const backgroundRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState<BackgroundFade>();
  const [imageAspectRatio, setImageAspectRatio] = useState<number>();

  useEffect(() => {
    const background = backgroundRef.current;
    const section = background?.closest<HTMLElement>(
      ".section.project-with-background",
    );
    const content = section?.querySelector<HTMLElement>(".content");
    if (!background || !section || !content) return;
    const image = background.querySelector<HTMLImageElement>("img");
    if (image?.naturalWidth && image.naturalHeight) {
      const nextAspectRatio = image.naturalWidth / image.naturalHeight;
      setImageAspectRatio((current) =>
        current === nextAspectRatio ? current : nextAspectRatio,
      );
    }
    const previousWave =
      section.previousElementSibling?.querySelector<SVGSVGElement>(
        ":scope > .wave-bottom",
      );
    const bottomWave = section.querySelector<SVGSVGElement>(
      ":scope > .wave-bottom",
    );

    let active = true;
    const updateFade = () => {
      const backgroundBounds = background.getBoundingClientRect();
      const backgroundHeight = backgroundBounds.height;
      if (!active || !backgroundBounds.width || !backgroundHeight) return;

      const textRange = document.createRange();
      textRange.selectNodeContents(content);
      const textBounds = Array.from(textRange.getClientRects());
      const textRight = textBounds.length
        ? Math.max(...textBounds.map((bounds) => bounds.right))
        : content.getBoundingClientRect().right;
      const fontSize = Number.parseFloat(window.getComputedStyle(content).fontSize);
      const twoSpaceGap = Number.isFinite(fontSize) ? fontSize * 0.5 : 8;
      const nextFadeStart = Math.min(
        100,
        Math.max(
          0,
          ((textRight + twoSpaceGap - backgroundBounds.left) /
            backgroundBounds.width) *
            100,
        ),
      );
      const nextFadeEnd = Math.min(100, Math.max(92, nextFadeStart + 8));
      const nextFadeMiddle =
        nextFadeStart + (nextFadeEnd - nextFadeStart) * 0.55;
      const minimumEdgeFade = Math.min(backgroundHeight * 0.08, 48);
      const stackedLayout = window.matchMedia("(max-width: 1023px)").matches;
      const topFadeHeight = Math.max(
        stackedLayout ? 0 : previousWave?.getBoundingClientRect().height ?? 0,
        minimumEdgeFade,
      );
      const bottomFadeHeight = Math.max(
        bottomWave?.getBoundingClientRect().height ?? 0,
        minimumEdgeFade,
      );
      const combinedEdgeFade = topFadeHeight + bottomFadeHeight;
      const edgeFadeScale =
        combinedEdgeFade > backgroundHeight * 0.75
          ? (backgroundHeight * 0.75) / combinedEdgeFade
          : 1;
      const nextFadeTop =
        (topFadeHeight * edgeFadeScale * 100) / backgroundHeight;
      const nextFadeBottom =
        (bottomFadeHeight * edgeFadeScale * 100) / backgroundHeight;

      setFade((current) =>
        current?.start === nextFadeStart &&
        current.middle === nextFadeMiddle &&
        current.end === nextFadeEnd &&
        current.top === nextFadeTop &&
        current.bottom === nextFadeBottom
          ? current
          : {
              start: nextFadeStart,
              middle: nextFadeMiddle,
              end: nextFadeEnd,
              top: nextFadeTop,
              bottom: nextFadeBottom,
            },
      );
    };

    updateFade();
    void document.fonts.ready.then(updateFade);

    const resizeObserver = new ResizeObserver(updateFade);
    resizeObserver.observe(section);
    resizeObserver.observe(background);
    resizeObserver.observe(content);
    if (previousWave) resizeObserver.observe(previousWave);
    if (bottomWave) resizeObserver.observe(bottomWave);
    const mutationObserver = new MutationObserver(updateFade);
    mutationObserver.observe(content, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => {
      active = false;
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  const style: FadeStyle = {};
  if (fade) {
    style["--project-background-fade-start"] = `${fade.start}%`;
    style["--project-background-fade-middle"] = `${fade.middle}%`;
    style["--project-background-fade-end"] = `${fade.end}%`;
    style["--project-background-fade-top"] = `${fade.top}%`;
    style["--project-background-fade-bottom"] = `${fade.bottom}%`;
  }
  if (imageAspectRatio) {
    style["--project-background-aspect-ratio"] = `${imageAspectRatio}`;
  }

  return (
    <div
      ref={backgroundRef}
      className="project-background"
      aria-hidden="true"
      style={style}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 1023px) 100vw, 56vw"
        unoptimized
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth && naturalHeight) {
            const nextAspectRatio = naturalWidth / naturalHeight;
            setImageAspectRatio((current) =>
              current === nextAspectRatio ? current : nextAspectRatio,
            );
          }
        }}
      />
    </div>
  );
}
