"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { MapPinned } from "lucide-react";
import type { ExploreItem } from "@/lib/data/public";
import { cn } from "@/lib/utils";

const ExploreMapCanvas = dynamic(
  () =>
    import("@/components/explore/explore-map-canvas").then(
      (module) => module.ExploreMapCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-[var(--color-forest-muted)]">
        Loading map…
      </div>
    ),
  },
);

export function ExploreExperience({ items }: { items: ExploreItem[] }) {
  const [activeId, setActiveId] = useState<string | undefined>(items[0]?.id);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="surface-card max-h-[75vh] overflow-auto p-3">
        <div className="grid gap-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              className={cn(
                "rounded-[1.25rem] border px-4 py-4 text-left transition",
                activeId === item.id
                  ? "border-[var(--color-clay)]/50 bg-[var(--color-paper-strong)]"
                  : "border-transparent bg-white/70 hover:border-[color:var(--color-border-soft)]",
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                {item.dataset}
              </p>
              <h3 className="mt-2 font-heading text-2xl text-[var(--color-pine)]">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--color-forest-muted)]">{item.summary}</p>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[var(--color-pine)]">
                <span>{item.subtitle || item.city}</span>
                <Link href={item.href} className="font-medium underline-offset-4 hover:underline">
                  Open listing
                </Link>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="surface-card h-[75vh] overflow-hidden p-3">
        <ExploreMapCanvas items={items} activeId={activeId} onSelect={setActiveId} />
      </div>
      {!items.length ? (
        <div className="surface-card flex items-center gap-3 p-6 lg:col-span-2">
          <MapPinned className="h-5 w-5 text-[var(--color-clay)]" />
          <p className="text-sm text-[var(--color-forest-muted)]">
            No listings match the current filters. Try widening the city or beginner
            filter set.
          </p>
        </div>
      ) : null}
    </div>
  );
}
