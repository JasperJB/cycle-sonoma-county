import { ListingStatus, UserRole } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { addDays, startOfDay } from "date-fns";

export async function getAdminDashboardData() {
  const today = startOfDay(new Date());

  const [
    users,
    verificationRequests,
    reports,
    sponsorPlacements,
    staleRides,
    pendingContent,
    siteSettings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.verificationRequest.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        user: true,
      },
      take: 12,
    }),
    prisma.report.findMany({
      orderBy: { createdAt: "asc" },
      take: 12,
    }),
    prisma.sponsorPlacement.findMany({
      orderBy: [{ slot: "asc" }, { priority: "desc" }],
      include: {
        organization: true,
        routeGuide: true,
      },
    }),
    prisma.rideSeries.findMany({
      where: {
        needsReconfirmation: true,
      },
      include: { organization: true },
      orderBy: { lastConfirmedAt: "asc" },
    }),
    prisma.organization.findMany({
      where: {
        listingStatus: {
          in: [ListingStatus.DRAFT, ListingStatus.PENDING_REVIEW],
        },
      },
      take: 12,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.siteSetting.findMany({
      orderBy: { key: "asc" },
    }),
  ]);

  const upcomingWeek = await prisma.$transaction([
    prisma.rideOccurrence.count({
      where: {
        startsAt: { gte: today, lte: addDays(today, 7) },
      },
    }),
    prisma.eventOccurrence.count({
      where: {
        startsAt: { gte: today, lte: addDays(today, 7) },
      },
    }),
  ]);

  return {
    stats: {
      users,
      organizerApprovalsPending: verificationRequests.filter(
        (item) => item.status === "PENDING",
      ).length,
      openReports: reports.filter((item) => item.status === "OPEN").length,
      staleRides: staleRides.length,
      weeklyHappenings: upcomingWeek[0] + upcomingWeek[1],
    },
    verificationRequests,
    reports,
    sponsorPlacements,
    staleRides,
    pendingContent,
    siteSettings,
  };
}

export async function getOrganizerDashboardData(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              shopProfile: true,
              clubProfile: true,
              rideSeries: true,
              eventSeries: true,
              routeGuides: true,
            },
          },
        },
      },
      verificationRequests: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const organizations = user.memberships.map((membership) => membership.organization);

  return {
    user,
    organizations,
    stats: {
      organizations: organizations.length,
      rides: organizations.reduce((sum, organization) => sum + organization.rideSeries.length, 0),
      events: organizations.reduce((sum, organization) => sum + organization.eventSeries.length, 0),
      routes: organizations.reduce((sum, organization) => sum + organization.routeGuides.length, 0),
    },
  };
}

export async function getUserLookupData(query?: string) {
  return prisma.user.findMany({
    where: query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { displayName: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ globalRole: "desc" }, { email: "asc" }],
    take: 20,
  });
}

export async function getOrganizationOptionsForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { globalRole: true },
  });

  if (user?.globalRole === UserRole.ADMIN) {
    return prisma.organization.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });
  }

  return prisma.organization.findMany({
    where: {
      memberships: {
        some: {
          userId,
        },
      },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });
}
