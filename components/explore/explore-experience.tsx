"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ChevronUp, List, MapPinned } from "lucide-react";
import type { ExploreItem } from "@/lib/data/public";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
        Loading map...
      </div>
    ),
  },
);

const datasetLabels: Record<ExploreItem["dataset"], string> = {
  shops: "shops & services",
  clubs: "clubs",
  rides: "rides",
  events: "events",
  routes: "routes",
};

function ExploreResultCard({
  item,
  isActive,
  onSelect,
}: {
  item: ExploreItem;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      data-explore-id={item.id}
      data-active={isActive ? "true" : "false"}
      className={cn(
        "scroll-mt-4 rounded-[1.25rem] border transition duration-200",
        isActive
          ? "border-[var(--color-clay)]/60 bg-[var(--color-paper-strong)] shadow-[0_18px_45px_-32px_rgba(168,101,55,0.9)] ring-1 ring-[color:rgba(168,101,55,0.16)]"
          : "border-transparent bg-white/70 hover:border-[color:var(--color-border-soft)]",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-pressed={isActive}
        className="w-full rounded-[1.25rem] px-4 py-4 text-left"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
          {datasetLabels[item.dataset]}
        </p>
        <h3 className="mt-2 break-words font-heading text-xl text-[var(--color-pine)] sm:text-2xl">
          {item.title}
        </h3>
        <p className="mt-1 break-words text-sm leading-6 text-[var(--color-forest-muted)]">
          {item.summary}
        </p>
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--color-border-soft)]/80 px-4 py-3 text-sm text-[var(--color-pine)]">
        <span className="break-words">{item.subtitle || item.city}</span>
        <Link href={item.href} className="font-medium underline-offset-4 hover:underline">
          Open listing
        </Link>
      </div>
    </div>
  );
}

export function ExploreExperience({ items }: { items: ExploreItem[] }) {
  const [selectedId, setSelectedId] = useState<string | undefined>(items[0]?.id);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const desktopResultsRef = useRef<HTMLDivElement | null>(null);
  const mobileResultsRef = useRef<HTMLDivElement | null>(null);
  const activeId = items.some((item) => item.id === selectedId) ? selectedId : items[0]?.id;
  const activeItem = items.find((item) => item.id === activeId) || items[0];

  function handleSelect(id: string) {
    setSelectedId(id);
  }

  useEffect(() => {
    if (!activeId) {
      return;
    }

    for (const container of [desktopResultsRef.current, mobileResultsRef.current]) {
      const card = container?.querySelector<HTMLElement>(`[data-explore-id="${activeId}"]`);

      if (!card) {
        continue;
      }

      card.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeId, isResultsOpen]);

  if (!items.length) {
    return (
      <div className="surface-card flex items-center gap-3 p-6">
        <MapPinned className="h-5 w-5 text-[var(--color-clay)]" />
        <p className="text-sm text-[var(--color-forest-muted)]">
          No listings match the current filters. Try widening the city or beginner
          filter set.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div
        ref={desktopResultsRef}
        className="surface-card hidden max-h-[75vh] overflow-auto p-3 lg:block"
      >
        <div className="grid gap-3">
          {items.map((item) => (
            <ExploreResultCard
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3 lg:space-y-0">
        <Sheet open={isResultsOpen} onOpenChange={setIsResultsOpen}>
          <SheetTrigger
            render={
              <button
                type="button"
                data-testid="explore-results-trigger"
                aria-expanded={isResultsOpen}
                className="surface-card flex w-full items-center justify-between gap-3 px-4 py-3 text-left lg:hidden"
              />
            }
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                {items.length} result{items.length === 1 ? "" : "s"}
              </p>
              <p className="truncate text-sm font-medium text-[var(--color-pine)]">
                {activeItem
                  ? `${datasetLabels[activeItem.dataset]}: ${activeItem.title}`
                  : "Browse results"}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-pine)]">
              <List className="h-4 w-4" />
              View results
            </span>
          </SheetTrigger>
          <SheetContent
            id="explore-results-sheet"
            side="bottom"
            className="max-h-[82svh] border-[color:var(--color-border-soft)] bg-[color:var(--color-paper)] p-0 lg:hidden"
          >
            <SheetHeader className="border-b border-[color:var(--color-border-soft)] px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <SheetTitle>Results</SheetTitle>
                  <SheetDescription>
                    Tap a result to sync the selected listing back to the map.
                  </SheetDescription>
                </div>
                <div className="rounded-full bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-pine)]">
                  {items.length}
                </div>
              </div>
              {activeItem ? (
                <div className="flex items-center gap-2 text-sm text-[var(--color-forest-muted)]">
                  <ChevronUp className="h-4 w-4 text-[var(--color-clay)]" />
                  <span className="truncate">
                    Selected: {datasetLabels[activeItem.dataset]} - {activeItem.title}
                  </span>
                </div>
              ) : null}
            </SheetHeader>
            <div ref={mobileResultsRef} className="overflow-y-auto px-4 py-4">
              <div className="grid gap-3">
                {items.map((item) => (
                  <ExploreResultCard
                    key={item.id}
                    item={item}
                    isActive={activeId === item.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div
          data-testid="explore-map"
          className="surface-card h-[min(62svh,34rem)] overflow-hidden p-3 sm:h-[30rem] lg:h-[75vh]"
        >
          <ExploreMapCanvas items={items} activeId={activeId} onSelect={handleSelect} />
        </div>
      </div>
    </div>
  );
}
