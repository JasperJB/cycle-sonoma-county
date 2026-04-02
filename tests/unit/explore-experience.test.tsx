import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExploreExperience } from "@/components/explore/explore-experience";
import type { ExploreItem } from "@/lib/data/public";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockExploreMapCanvas({
      onSelect,
    }: {
      onSelect: (id: string) => void;
    }) {
      return (
        <button
          type="button"
          data-testid="mock-map-select"
          onClick={() => onSelect("route-2")}
        >
          Select from map
        </button>
      );
    },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: () => null,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

const items: ExploreItem[] = [
  {
    id: "route-1",
    dataset: "routes",
    title: "Valley Loop",
    slug: "valley-loop",
    href: "/routes/valley-loop",
    city: "Santa Rosa",
    summary: "A mellow paved loop.",
    subtitle: "18 mi",
    latitude: 38.4,
    longitude: -122.7,
    verified: true,
    badges: ["Paved"],
  },
  {
    id: "route-2",
    dataset: "routes",
    title: "River Ramble",
    slug: "river-ramble",
    href: "/routes/river-ramble",
    city: "Healdsburg",
    summary: "A scenic spin along the river.",
    subtitle: "24 mi",
    latitude: 38.6,
    longitude: -122.9,
    verified: true,
    badges: ["Scenic"],
  },
];

describe("ExploreExperience", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("highlights the matching list item when the map selects an organization", () => {
    const { getByTestId, container } = render(<ExploreExperience items={items} />);

    fireEvent.click(getByTestId("mock-map-select"));

    const activeCard = container.querySelector('[data-explore-id="route-2"]');
    const inactiveCard = container.querySelector('[data-explore-id="route-1"]');
    const activeButton = activeCard?.querySelector("button");

    expect(activeCard?.getAttribute("data-active")).toBe("true");
    expect(activeButton?.getAttribute("aria-pressed")).toBe("true");
    expect(inactiveCard?.getAttribute("data-active")).toBe("false");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
