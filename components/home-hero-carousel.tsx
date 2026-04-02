"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState } from "react";
import carouselHero1 from "@/public/home-carousel/carousel_hero1.jpg";
import carouselHero2 from "@/public/home-carousel/carousel_hero2.jpg";
import carouselHero3 from "@/public/home-carousel/carousel_hero3.jpg";
import carouselHero4 from "@/public/home-carousel/carousel_hero4.jpg";
import carouselHero5 from "@/public/home-carousel/carousel_hero5.jpg";

const AUTOPLAY_INTERVAL_MS = 4800;
const TRANSITION_DURATION_MS = 900;

const slides: StaticImageData[] = [
  carouselHero1,
  carouselHero2,
  carouselHero3,
  carouselHero4,
  carouselHero5,
];

export function HomeHeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const currentIndex = activeIndexRef.current;
      const nextIndex = (currentIndex + 1) % slides.length;

      setPreviousIndex(currentIndex);
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (previousIndex === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPreviousIndex(null);
    }, TRANSITION_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [previousIndex]);

  const activeSlide = slides[activeIndex];
  const previousSlide = previousIndex === null ? null : slides[previousIndex];

  return (
    <div className="relative">
      <div className="absolute -right-6 top-6 hidden h-40 w-40 rounded-full bg-[color:var(--color-clay)]/12 blur-3xl lg:block" />
      <div className="surface-card relative overflow-hidden p-3 sm:p-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-[var(--color-pine)]">
          {previousSlide ? (
            <Image
              key={`previous-${previousIndex}`}
              src={previousSlide}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover"
            />
          ) : null}
          <Image
            key={`active-${activeIndex}`}
            src={activeSlide}
            alt=""
            fill
            preload={activeIndex === 0}
            placeholder="blur"
            sizes="(max-width: 1024px) 100vw, 42vw"
            className="object-cover motion-reduce:animate-none [animation:home-carousel-fade_900ms_cubic-bezier(0.22,1,0.36,1)]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(24,58,45,0.62)] via-[rgba(24,58,45,0.14)] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 space-y-3 p-5 text-white sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/78">
                Sonoma County rides
              </p>
              <p className="text-xs font-semibold tabular-nums text-white/70">
                {String(activeIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
              </p>
            </div>
            <p className="max-w-sm font-heading text-2xl leading-tight">
              Coastline, climbs, and the roads between them.
            </p>
            <div className="flex gap-2">
              {slides.map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    index === activeIndex ? "w-10 bg-white" : "w-3 bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
