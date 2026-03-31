import {
  ListingStatus,
  OccurrenceStatus,
  OrganizationType,
  VerificationStatus,
} from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { addDays, startOfDay } from "date-fns";

const today = () => startOfDay(new Date());

const publishedOrgWhere = {
  listingStatus: ListingStatus.PUBLISHED,
};

const activeSponsorWhere = {
  isActive: true,
  OR: [{ activeFrom: null }, { activeFrom: { lte: new Date() } }],
  AND: [{ OR: [{ activeTo: null }, { activeTo: { gte: new Date() } }] }],
};

async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch {
    return fallback;
  }
}

export type ExploreFilters = {
  dataset?: "all" | "shops" | "clubs" | "rides" | "events" | "routes";
  city?: string;
  verifiedOnly?: boolean;
  beginnerFriendly?: boolean;
  youthFriendly?: boolean;
  noDrop?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export type ExploreItem = {
  id: string;
  dataset: "shops" | "clubs" | "rides" | "events" | "routes";
  title: string;
  slug: string;
  href: string;
  city: string;
  summary: string;
  subtitle?: string;
  latitude?: number | null;
  longitude?: number | null;
  verified: boolean;
  beginnerFriendly?: boolean;
  youthFriendly?: boolean;
  dateLabel?: string;
  badges: string[];
};

export async function getHomePageData() {
  const [featuredSponsors, shops, clubs, routes, rideOccurrences, eventOccurrences] =
    await safeQuery(
      () =>
        Promise.all([
          prisma.sponsorPlacement.findMany({
            where: activeSponsorWhere,
            include: {
              organization: true,
              routeGuide: true,
            },
            orderBy: [{ slot: "asc" }, { priority: "desc" }],
            take: 6,
          }),
          prisma.organization.findMany({
            where: {
              ...publishedOrgWhere,
              type: OrganizationType.SHOP,
            },
            include: { shopProfile: true },
            take: 3,
          }),
          prisma.organization.findMany({
            where: {
              ...publishedOrgWhere,
              type: {
                in: [
                  OrganizationType.CLUB,
                  OrganizationType.TEAM,
                  OrganizationType.ADVOCACY,
                  OrganizationType.INFORMAL_GROUP,
                ],
              },
            },
            include: { clubProfile: true },
            take: 3,
          }),
          prisma.routeGuide.findMany({
            where: { listingStatus: ListingStatus.PUBLISHED },
            orderBy: { createdAt: "desc" },
            take: 3,
          }),
          prisma.rideOccurrence.findMany({
            where: {
              startsAt: {
                gte: today(),
                lte: addDays(today(), 7),
              },
              status: { not: OccurrenceStatus.CANCELED },
              rideSeries: {
                listingStatus: ListingStatus.PUBLISHED,
              },
            },
            include: {
              rideSeries: {
                include: {
                  organization: true,
                },
              },
            },
            orderBy: { startsAt: "asc" },
            take: 6,
          }),
          prisma.eventOccurrence.findMany({
            where: {
              startsAt: {
                gte: today(),
                lte: addDays(today(), 7),
              },
              status: { not: OccurrenceStatus.CANCELED },
              eventSeries: {
                listingStatus: ListingStatus.PUBLISHED,
              },
            },
            include: {
              eventSeries: {
                include: {
                  organization: true,
                },
              },
            },
            orderBy: { startsAt: "asc" },
            take: 6,
          }),
        ]),
      [[], [], [], [], [], []],
    );

  return {
    featuredSponsors,
    featuredShop: shops[0] || null,
    featuredClub: clubs[0] || null,
    featuredRoute: routes[0] || null,
    quickShops: shops,
    quickClubs: clubs,
    quickRoutes: routes,
    thisWeekRides: rideOccurrences,
    thisWeekEvents: eventOccurrences,
  };
}

function containsSearch(search?: string) {
  if (!search?.trim()) {
    return undefined;
  }

  return {
    contains: search.trim().toLowerCase(),
    mode: "insensitive" as const,
  };
}

export async function getShops(filters?: ExploreFilters) {
  return safeQuery(
    () =>
      prisma.organization.findMany({
        where: {
          ...publishedOrgWhere,
          type: OrganizationType.SHOP,
          city: filters?.city || undefined,
          verificationStatus: filters?.verifiedOnly
            ? VerificationStatus.APPROVED
            : undefined,
          searchDocument: containsSearch(filters?.search),
        },
        include: {
          shopProfile: true,
          rideSeries: {
            where: { listingStatus: ListingStatus.PUBLISHED },
            take: 3,
          },
          eventSeries: {
            where: { listingStatus: ListingStatus.PUBLISHED },
            take: 3,
          },
        },
        orderBy: [{ verificationStatus: "asc" }, { name: "asc" }],
      }),
    [],
  );
}

export async function getClubs(filters?: ExploreFilters) {
  return safeQuery(
    () =>
      prisma.organization.findMany({
        where: {
          ...publishedOrgWhere,
          type: {
            in: [
              OrganizationType.CLUB,
              OrganizationType.TEAM,
              OrganizationType.ADVOCACY,
              OrganizationType.INFORMAL_GROUP,
            ],
          },
          city: filters?.city || undefined,
          verificationStatus: filters?.verifiedOnly
            ? VerificationStatus.APPROVED
            : undefined,
          searchDocument: containsSearch(filters?.search),
        },
        include: {
          clubProfile: true,
          rideSeries: {
            where: { listingStatus: ListingStatus.PUBLISHED },
            take: 2,
          },
          eventSeries: {
            where: { listingStatus: ListingStatus.PUBLISHED },
            take: 2,
          },
        },
        orderBy: [{ verificationStatus: "asc" }, { name: "asc" }],
      }),
    [],
  );
}

export async function getRides(filters?: ExploreFilters) {
  return safeQuery(
    () =>
      prisma.rideSeries.findMany({
        where: {
          listingStatus: ListingStatus.PUBLISHED,
          city: filters?.city || undefined,
          beginnerFriendly: filters?.beginnerFriendly || undefined,
          youthFriendly: filters?.youthFriendly || undefined,
          dropPolicy: filters?.noDrop ? "NO_DROP" : undefined,
          organization: {
            verificationStatus: filters?.verifiedOnly
              ? VerificationStatus.APPROVED
              : undefined,
          },
          searchDocument: containsSearch(filters?.search),
        },
        include: {
          organization: true,
          occurrences: {
            where: {
              startsAt: {
                gte: today(),
              },
              status: { not: OccurrenceStatus.CANCELED },
            },
            orderBy: { startsAt: "asc" },
            take: 3,
          },
        },
        orderBy: [{ needsReconfirmation: "asc" }, { title: "asc" }],
      }),
    [],
  );
}

export async function getEvents(filters?: ExploreFilters) {
  return safeQuery(
    () =>
      prisma.eventSeries.findMany({
        where: {
          listingStatus: ListingStatus.PUBLISHED,
          city: filters?.city || undefined,
          organization: {
            verificationStatus: filters?.verifiedOnly
              ? VerificationStatus.APPROVED
              : undefined,
          },
          searchDocument: containsSearch(filters?.search),
        },
        include: {
          organization: true,
          occurrences: {
            where: {
              startsAt: {
                gte: filters?.dateFrom ? new Date(filters.dateFrom) : today(),
                lte: filters?.dateTo
                  ? new Date(filters.dateTo)
                  : addDays(today(), 180),
              },
            },
            orderBy: { startsAt: "asc" },
            take: 3,
          },
        },
        orderBy: { startsAt: "asc" },
      }),
    [],
  );
}

export async function getRoutes(filters?: ExploreFilters) {
  return safeQuery(
    () =>
      prisma.routeGuide.findMany({
        where: {
          listingStatus: ListingStatus.PUBLISHED,
          city: filters?.city || undefined,
          beginnerFriendly: filters?.beginnerFriendly || undefined,
          searchDocument: containsSearch(filters?.search),
        },
        include: {
          organization: true,
        },
        orderBy: [{ beginnerFriendly: "desc" }, { title: "asc" }],
      }),
    [],
  );
}

export async function getExploreItems(filters: ExploreFilters = {}) {
  const dataset = filters.dataset || "all";
  const [shops, clubs, rides, events, routes] = await Promise.all([
    dataset === "all" || dataset === "shops"
      ? getShops(filters)
      : Promise.resolve([]),
    dataset === "all" || dataset === "clubs"
      ? getClubs(filters)
      : Promise.resolve([]),
    dataset === "all" || dataset === "rides"
      ? getRides(filters)
      : Promise.resolve([]),
    dataset === "all" || dataset === "events"
      ? getEvents(filters)
      : Promise.resolve([]),
    dataset === "all" || dataset === "routes"
      ? getRoutes(filters)
      : Promise.resolve([]),
  ]);

  const shopItems: ExploreItem[] = shops.map((shop) => ({
    id: shop.id,
    dataset: "shops",
    title: shop.name,
    slug: shop.slug,
    href: `/shops/${shop.slug}`,
    city: shop.city,
    summary: shop.shortDescription,
    subtitle: shop.shopProfile?.serviceCategories.join(" • "),
    latitude: shop.latitude,
    longitude: shop.longitude,
    verified: shop.verificationStatus === VerificationStatus.APPROVED,
    badges: [
      ...(shop.shopProfile?.offersRentals ? ["Rentals"] : []),
      ...(shop.shopProfile?.supportsEBikes ? ["E-bike"] : []),
    ],
  }));

  const clubItems: ExploreItem[] = clubs.map((club) => ({
    id: club.id,
    dataset: "clubs",
    title: club.name,
    slug: club.slug,
    href: `/clubs/${club.slug}`,
    city: club.city,
    summary: club.shortDescription,
    subtitle: club.clubProfile?.disciplines.join(" • "),
    latitude: club.latitude,
    longitude: club.longitude,
    verified: club.verificationStatus === VerificationStatus.APPROVED,
    beginnerFriendly:
      club.clubProfile?.audienceTags.includes("Beginner Friendly"),
    youthFriendly: club.clubProfile?.youthFocused,
    badges: [
      ...(club.clubProfile?.youthFocused ? ["Youth"] : []),
      ...(club.clubProfile?.clubKind
        ? [club.clubProfile.clubKind.replaceAll("_", " ")]
        : []),
    ],
  }));

  const rideItems: ExploreItem[] = rides.map((ride) => ({
    id: ride.id,
    dataset: "rides",
    title: ride.title,
    slug: ride.slug,
    href: `/rides/${ride.slug}`,
    city: ride.city,
    summary: ride.summary,
    subtitle: `${ride.paceLabel} • ${ride.dropPolicy.replace("_", "-")}`,
    latitude: ride.latitude,
    longitude: ride.longitude,
    verified: ride.organization.verificationStatus === VerificationStatus.APPROVED,
    beginnerFriendly: ride.beginnerFriendly,
    youthFriendly: ride.youthFriendly,
    dateLabel: ride.occurrences[0]?.startsAt.toISOString(),
    badges: [
      ride.rideType.replace("_", " "),
      ...(ride.needsReconfirmation ? ["Needs reconfirmation"] : []),
    ],
  }));

  const eventItems: ExploreItem[] = events.map((event) => ({
    id: event.id,
    dataset: "events",
    title: event.title,
    slug: event.slug,
    href: `/events/${event.slug}`,
    city: event.city,
    summary: event.summary,
    subtitle: event.eventType.replace("_", " "),
    latitude: event.latitude,
    longitude: event.longitude,
    verified: event.organization.verificationStatus === VerificationStatus.APPROVED,
    dateLabel: event.occurrences[0]?.startsAt.toISOString(),
    badges: [event.priceText || "Details"],
  }));

  const routeItems: ExploreItem[] = routes.map((route) => ({
    id: route.id,
    dataset: "routes",
    title: route.title,
    slug: route.slug,
    href: `/routes/${route.slug}`,
    city: route.city,
    summary: route.summary,
    subtitle: `${route.distanceMiles} mi • ${route.elevationFeet} ft`,
    latitude: route.latitude,
    longitude: route.longitude,
    verified: route.organization?.verificationStatus === VerificationStatus.APPROVED,
    beginnerFriendly: route.beginnerFriendly,
    badges: [
      route.surface,
      ...(route.touristFriendly ? ["Visitor-friendly"] : []),
    ],
  }));

  return [...shopItems, ...clubItems, ...rideItems, ...eventItems, ...routeItems];
}

export async function getShopBySlug(slug: string) {
  return safeQuery(
    () =>
      prisma.organization.findFirst({
        where: {
          slug,
          type: OrganizationType.SHOP,
        },
        include: {
          shopProfile: true,
          rideSeries: {
            where: { listingStatus: ListingStatus.PUBLISHED },
            include: {
              occurrences: {
                where: {
                  startsAt: { gte: today() },
                  status: { not: OccurrenceStatus.CANCELED },
                },
                orderBy: { startsAt: "asc" },
                take: 2,
              },
            },
          },
          eventSeries: {
            where: { listingStatus: ListingStatus.PUBLISHED },
            include: {
              occurrences: {
                where: { startsAt: { gte: today() } },
                orderBy: { startsAt: "asc" },
                take: 2,
              },
            },
          },
        },
      }),
    null,
  );
}

export async function getClubBySlug(slug: string) {
  return safeQuery(
    () =>
      prisma.organization.findFirst({
        where: {
          slug,
          type: {
            in: [
              OrganizationType.CLUB,
              OrganizationType.TEAM,
              OrganizationType.ADVOCACY,
              OrganizationType.INFORMAL_GROUP,
            ],
          },
        },
        include: {
          clubProfile: true,
          rideSeries: {
            where: { listingStatus: ListingStatus.PUBLISHED },
            include: {
              occurrences: {
                where: { startsAt: { gte: today() } },
                orderBy: { startsAt: "asc" },
                take: 2,
              },
            },
          },
          eventSeries: {
            where: { listingStatus: ListingStatus.PUBLISHED },
            include: {
              occurrences: {
                where: { startsAt: { gte: today() } },
                orderBy: { startsAt: "asc" },
                take: 2,
              },
            },
          },
        },
      }),
    null,
  );
}

export async function getRideBySlug(slug: string) {
  return safeQuery(
    () =>
      prisma.rideSeries.findUnique({
        where: { slug },
        include: {
          organization: true,
          occurrences: {
            where: {
              startsAt: { gte: addDays(today(), -7) },
            },
            orderBy: { startsAt: "asc" },
            take: 8,
          },
          exceptions: {
            orderBy: { occurrenceAt: "asc" },
          },
        },
      }),
    null,
  );
}

export async function getEventBySlug(slug: string) {
  return safeQuery(
    () =>
      prisma.eventSeries.findUnique({
        where: { slug },
        include: {
          organization: true,
          occurrences: {
            where: {
              startsAt: { gte: addDays(today(), -7) },
            },
            orderBy: { startsAt: "asc" },
            take: 8,
          },
        },
      }),
    null,
  );
}

export async function getRouteBySlug(slug: string) {
  return safeQuery(
    () =>
      prisma.routeGuide.findUnique({
        where: { slug },
        include: {
          organization: true,
          sponsorPlacements: true,
        },
      }),
    null,
  );
}

export async function getVisitorPageData() {
  const [routes, shops, rides, events, settings] = await safeQuery(
    () =>
      Promise.all([
        prisma.routeGuide.findMany({
          where: {
            listingStatus: ListingStatus.PUBLISHED,
            touristFriendly: true,
          },
          orderBy: [{ beginnerFriendly: "desc" }, { createdAt: "desc" }],
          take: 4,
        }),
        prisma.organization.findMany({
          where: {
            ...publishedOrgWhere,
            type: OrganizationType.SHOP,
            shopProfile: {
              offersRentals: true,
            },
          },
          include: {
            shopProfile: true,
          },
          take: 4,
        }),
        prisma.rideSeries.findMany({
          where: {
            listingStatus: ListingStatus.PUBLISHED,
            beginnerFriendly: true,
          },
          include: {
            organization: true,
            occurrences: {
              where: { startsAt: { gte: today() } },
              orderBy: { startsAt: "asc" },
              take: 1,
            },
          },
          take: 4,
        }),
        prisma.eventSeries.findMany({
          where: {
            listingStatus: ListingStatus.PUBLISHED,
          },
          include: {
            organization: true,
            occurrences: {
              where: { startsAt: { gte: today() } },
              orderBy: { startsAt: "asc" },
              take: 1,
            },
          },
          orderBy: { startsAt: "asc" },
          take: 3,
        }),
        prisma.siteSetting.findUnique({ where: { key: "site" } }),
      ]),
    [[], [], [], [], null],
  );

  return {
    routes,
    shops,
    rides,
    events,
    seasonalNote:
      (settings?.value as { visitorSeasonNote?: string } | null)?.visitorSeasonNote ||
      "Mornings can start cool, coastal afternoons can turn windy, and lights are worth carrying year-round.",
  };
}

export async function getAccountFavorites(userId: string) {
  const [favorites, follows] = await safeQuery(
    () =>
      Promise.all([
        prisma.favorite.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.follow.findMany({
          where: { userId },
          include: { organization: true },
          orderBy: { createdAt: "desc" },
        }),
      ]),
    [[], []],
  );

  return { favorites, follows };
}
