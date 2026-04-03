import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "/",
    "/explore",
    "/shops",
    "/clubs",
    "/rides",
    "/events",
    "/routes",
    "/visitors",
    "/newsletter",
    "/about",
  ];

  const [shops, clubs, rides, events, routes] = await Promise.all([
    prisma.organization.findMany({
      where: {
        type: { in: ["SHOP", "BIKE_FRIENDLY_BUSINESS"] },
        listingStatus: "PUBLISHED",
      },
      select: { slug: true, updatedAt: true },
    }),
    prisma.organization.findMany({
      where: {
        type: {
          in: ["CLUB", "TEAM", "ADVOCACY", "EVENT_PROMOTER", "COACH", "INFORMAL_GROUP"],
        },
        listingStatus: "PUBLISHED",
      },
      select: { slug: true, updatedAt: true },
    }),
    prisma.rideSeries.findMany({
      where: { listingStatus: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.eventSeries.findMany({
      where: { listingStatus: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.routeGuide.findMany({
      where: { listingStatus: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
  ]).catch(() => [[], [], [], [], []]);

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route),
      lastModified: new Date(),
    })),
    ...shops.map((shop) => ({
      url: absoluteUrl(`/shops/${shop.slug}`),
      lastModified: shop.updatedAt,
    })),
    ...clubs.map((club) => ({
      url: absoluteUrl(`/clubs/${club.slug}`),
      lastModified: club.updatedAt,
    })),
    ...rides.map((ride) => ({
      url: absoluteUrl(`/rides/${ride.slug}`),
      lastModified: ride.updatedAt,
    })),
    ...events.map((event) => ({
      url: absoluteUrl(`/events/${event.slug}`),
      lastModified: event.updatedAt,
    })),
    ...routes.map((route) => ({
      url: absoluteUrl(`/routes/${route.slug}`),
      lastModified: route.updatedAt,
    })),
  ];
}
