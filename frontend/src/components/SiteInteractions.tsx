"use client";

import { useEffect } from "react";

function parseColor(color: string): number[] | null {
  const values = color.match(/rgba?\(([^)]+)\)/)?.[1];
  if (!values) return null;

  const channels = values.split(/[,\s/]+/).filter(Boolean).slice(0, 3).map(Number);
  return channels.length === 3 && channels.every(Number.isFinite) ? channels : null;
}

function initializeInteractions(): () => void {
  const cleanups: Array<() => void> = [];

  const ticks = document.querySelectorAll(".tick");
  const easterEgg = document.getElementById("easterNope");
  if (easterEgg) {
    const timers = new Set<number>();
    const popOut = () => {
      easterEgg.className = "popout";
    };
    const listeners = Array.from(ticks, (tick) => {
      const onClick = () => {
        easterEgg.className = "popin";
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          popOut();
        }, 3000);
        timers.add(timer);
      };
      tick.addEventListener("click", onClick);
      return () => tick.removeEventListener("click", onClick);
    });
    cleanups.push(() => {
      listeners.forEach((remove) => remove());
      timers.forEach(window.clearTimeout);
    });
  }

  const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const sections = document.querySelectorAll<HTMLElement>("[data-theme-color]");
  if (theme && sections.length) {
    let currentColor = "rgb(255,255,255)";
    let activeTarget = currentColor;
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const targetColor = entry.target.getAttribute("data-theme-color");
          if (!targetColor || targetColor === currentColor || targetColor === activeTarget) return;

          const from = parseColor(currentColor);
          const to = parseColor(targetColor);
          if (!from || !to) return;

          activeTarget = targetColor;
          if (frame) cancelAnimationFrame(frame);
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / 300, 1);
            const next = from.map((value, index) =>
              Math.round(value + ((to[index] ?? value) - value) * progress),
            );
            theme.setAttribute("content", `rgb(${next.join(",")})`);

            if (progress < 1) {
              frame = requestAnimationFrame(step);
            } else {
              currentColor = targetColor;
              activeTarget = targetColor;
              frame = 0;
            }
          };
          frame = requestAnimationFrame(step);
        });
      },
      { threshold: 0.1, rootMargin: "10% 0px -90% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    cleanups.push(() => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    });
  }

  const thwipVideo = document.getElementById("thwip-video");
  if (thwipVideo instanceof HTMLVideoElement) {
    const unmute = () => {
      thwipVideo.muted = false;
    };
    const mute = () => {
      thwipVideo.muted = true;
    };
    thwipVideo.addEventListener("mouseenter", unmute);
    thwipVideo.addEventListener("mouseleave", mute);
    cleanups.push(() => {
      thwipVideo.removeEventListener("mouseenter", unmute);
      thwipVideo.removeEventListener("mouseleave", mute);
    });
  }

  const icon = document.querySelector<HTMLElement>(".appIcon");
  if (icon && window.matchMedia("(hover: hover)").matches) {
    const degrees = 8;
    let pendingPointer: PointerEvent | null = null;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!pendingPointer) return;
      const bounds = icon.getBoundingClientRect();
      const halfSize = bounds.width / 2;
      if (!halfSize) return;
      const xDistance = Math.min(
        Math.max(-(bounds.x - pendingPointer.x + halfSize), -halfSize),
        halfSize,
      );
      const yDistance = Math.min(
        Math.max(bounds.y - pendingPointer.y + halfSize, -halfSize),
        halfSize,
      );
      const x = Math.round(xDistance / (halfSize / 100)) / 100;
      const y = Math.round(yDistance / (halfSize / 100)) / 100;
      icon.style.transform = `rotateX(${y * degrees}deg) rotateY(${x * degrees}deg)`;
    };
    const onPointerMove = (event: PointerEvent) => {
      pendingPointer = event;
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    cleanups.push(() => {
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) cancelAnimationFrame(frame);
    });
  }

  return () => cleanups.forEach((cleanup) => cleanup());
}

export function SiteInteractions() {
  useEffect(() => initializeInteractions(), []);
  return null;
}
