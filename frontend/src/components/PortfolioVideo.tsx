"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";

type PortfolioVideoProps = ComponentProps<"video"> & {
  "data-video-src": string;
  "data-allow-motion"?: string;
};

export function PortfolioVideo({
  "data-video-src": videoSource,
  "data-allow-motion": allowMotion,
  ...videoProps
}: PortfolioVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const canPlay =
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      allowMotion === "true";
    const bounds = video.getBoundingClientRect();
    const preloadDistance = 400;
    if (
      bounds.bottom >= -preloadDistance &&
      bounds.top <= window.innerHeight + preloadDistance
    ) {
      setIsLoaded(true);
      setShouldPlay(canPlay);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsLoaded((loaded) => loaded || entry.isIntersecting);
          setShouldPlay(entry.isIntersecting && canPlay);
        });
      },
      { threshold: 0.01, rootMargin: "400px 0px" },
    );
    observer.observe(video);

    return () => observer.disconnect();
  }, [allowMotion, videoSource]);

  useEffect(() => {
    if (isLoaded) videoRef.current?.load();
  }, [isLoaded]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isLoaded) return;

    if (shouldPlay) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [isLoaded, shouldPlay]);

  return (
    <video
      {...videoProps}
      data-video-src={videoSource}
      data-allow-motion={allowMotion}
      ref={videoRef}
      src={isLoaded ? videoSource : undefined}
    />
  );
}
