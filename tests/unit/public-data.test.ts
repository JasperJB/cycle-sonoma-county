import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListingStatus } from "@/app/generated/prisma/enums";
import { getVisitorPageData } from "@/lib/data/public";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    routeGuide: { findMany: vi.fn() },
    organization: { findMany: vi.fn() },
    rideSeries: { findMany: vi.fn() },
    eventSeries: { findMany: vi.fn() },
    siteSetting: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("getVisitorPageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.routeGuide.findMany.mockResolvedValue([]);
    prismaMock.organization.findMany.mockResolvedValue([]);
    prismaMock.rideSeries.findMany.mockResolvedValue([]);
    prismaMock.eventSeries.findMany.mockResolvedValue([]);
    prismaMock.siteSetting.findUnique.mockResolvedValue(null);
  });

  it("includes no-drop rides in the visitor-friendly ride query", async () => {
    await getVisitorPageData();

    expect(prismaMock.rideSeries.findMany).toHaveBeenCalledTimes(1);

    const query = prismaMock.rideSeries.findMany.mock.calls[0][0];

    expect(query.where).toEqual({
      listingStatus: ListingStatus.PUBLISHED,
      OR: [{ beginnerFriendly: true }, { dropPolicy: "NO_DROP" }],
    });
  });
});
