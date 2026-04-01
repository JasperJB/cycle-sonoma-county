"use server";

import {
  DifficultyLevel,
  ListingStatus,
  OccurrenceStatus,
  OrganizationMembershipRole,
  UserRole,
  VerificationStatus,
} from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  organizationOnboardingSchema,
  rideSeriesSchema,
  eventSeriesSchema,
  routeGuideSchema,
  verificationRequestSchema,
} from "@/lib/validators";
import {
  canManageOrganization,
  requireAdminUser,
  requireOrganizerUser,
  requireUserRecord,
} from "@/lib/permissions";
import {
  buildRecurrenceRule,
  combineZonedDate,
  materializationWindow,
  materializeOccurrences,
  recurrenceToText,
} from "@/lib/recurrence";
import { revalidatePath } from "next/cache";
import slugify from "slugify";

function slug(value: string) {
  return slugify(value, { lower: true, strict: true });
}

function searchDocument(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export async function createVerificationRequestAction(input: {
  organizationName: string;
  organizationType:
    | "SHOP"
    | "CLUB"
    | "TEAM"
    | "ADVOCACY"
    | "EVENT_PROMOTER"
    | "COACH"
    | "INFORMAL_GROUP";
  websiteOrSocialUrl?: string;
  note: string;
}) {
  const user = await requireUserRecord();
  const parsed = verificationRequestSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  await prisma.verificationRequest.create({
    data: {
      userId: user.id,
      ...parsed.data,
      websiteOrSocialUrl: parsed.data.websiteOrSocialUrl || "https://example.com",
    },
  });

  revalidatePath("/become-organizer");
  revalidatePath("/admin/verifications");

  return {
    ok: true,
    message: "Verification request submitted.",
  };
}

export async function approveVerificationRequestAction(
  requestId: string,
  adminNote?: string,
) {
  const admin = await requireAdminUser();
  const request = await prisma.verificationRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: {
          globalRole: true,
        },
      },
    },
  });

  if (!request) {
    return { ok: false, message: "Verification request not found." };
  }

  await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: VerificationStatus.APPROVED,
        adminNote,
        reviewedAt: new Date(),
        reviewedById: admin.id,
      },
    }),
    prisma.user.update({
      where: { id: request.userId },
      data: {
        isOrganizerApproved: true,
        globalRole:
          request.user.globalRole === UserRole.ADMIN ? UserRole.ADMIN : UserRole.ORGANIZER,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: admin.id,
        action: "verification.approved",
        entityType: "VerificationRequest",
        entityId: requestId,
        metadata: {
          email: request.organizationName,
        },
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/verifications");

  return {
    ok: true,
    message: "Organizer approved.",
  };
}

export async function rejectVerificationRequestAction(
  requestId: string,
  adminNote: string,
) {
  const admin = await requireAdminUser();

  await prisma.verificationRequest.update({
    where: { id: requestId },
    data: {
      status: VerificationStatus.REJECTED,
      adminNote,
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });

  revalidatePath("/admin/verifications");

  return {
    ok: true,
    message: "Verification request rejected.",
  };
}

export async function createOrganizationAction(input: {
  organizationType:
    | "SHOP"
    | "CLUB"
    | "TEAM"
    | "ADVOCACY"
    | "EVENT_PROMOTER"
    | "COACH"
    | "INFORMAL_GROUP";
  name: string;
  shortDescription: string;
  description?: string;
  city: string;
  websiteUrl?: string;
  socialUrl?: string;
  addressLine1?: string;
  latitude?: number;
  longitude?: number;
}) {
  const user = await requireOrganizerUser();
  const parsed = organizationOnboardingSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const organization = await prisma.organization.create({
    data: {
      slug: slug(parsed.data.name),
      name: parsed.data.name,
      type: parsed.data.organizationType,
      shortDescription: parsed.data.shortDescription,
      description: parsed.data.description,
      city: parsed.data.city,
      addressLine1: parsed.data.addressLine1,
      websiteUrl: parsed.data.websiteUrl,
      instagramUrl: parsed.data.socialUrl,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      listingStatus: ListingStatus.DRAFT,
      verificationStatus: VerificationStatus.PENDING,
      searchDocument: searchDocument([
        parsed.data.name,
        parsed.data.shortDescription,
        parsed.data.description,
        parsed.data.city,
      ]),
      memberships: {
        create: {
          userId: user.id,
          role: OrganizationMembershipRole.OWNER,
        },
      },
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingCompletedAt: new Date() },
  });

  revalidatePath("/organizer");

  return {
    ok: true,
    organizationId: organization.id,
    message: "Organization draft created.",
  };
}

export async function createRideSeriesAction(input: Parameters<typeof rideSeriesSchema.parse>[0]) {
  const user = await requireOrganizerUser();
  const parsed = rideSeriesSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const permitted = await canManageOrganization(user.id, parsed.data.organizationId);

  if (!permitted) {
    return { ok: false, message: "You cannot manage that organization." };
  }

  const recurrenceRule = buildRecurrenceRule({
    frequency: parsed.data.recurrenceMode,
    timezone: "America/Los_Angeles",
    startDate: parsed.data.startDate,
    startTime: parsed.data.startTimeLocal,
    interval: parsed.data.recurrenceInterval,
    weekdays: parsed.data.weekdays,
    monthlyWeek: parsed.data.monthlyWeek,
    monthlyWeekday: parsed.data.monthlyWeekday,
    until: parsed.data.recurrenceUntil,
  });

  const ride = await prisma.rideSeries.create({
    data: {
      organizationId: parsed.data.organizationId,
      slug: slug(parsed.data.title),
      title: parsed.data.title,
      summary: parsed.data.summary,
      description: parsed.data.description,
      city: parsed.data.city,
      rideType: parsed.data.rideType,
      paceLabel: parsed.data.paceLabel,
      dropPolicy: parsed.data.dropPolicy,
      difficulty: DifficultyLevel.MODERATE,
      skillLevel: parsed.data.skillLevel,
      meetingLocationName: parsed.data.meetingLocationName,
      meetingAddress: parsed.data.meetingAddress,
      startDate: combineZonedDate(
        parsed.data.startDate,
        parsed.data.startTimeLocal,
        "America/Los_Angeles",
      ),
      startTimeLocal: parsed.data.startTimeLocal,
      estimatedDurationMinutes: parsed.data.estimatedDurationMinutes,
      routeUrl: parsed.data.routeUrl,
      beginnerFriendly: parsed.data.beginnerFriendly,
      youthFriendly: parsed.data.youthFriendly,
      recurrenceRule,
      recurrenceSummary: recurrenceToText(recurrenceRule),
      recurrenceTimezone: "America/Los_Angeles",
      recurrenceEndsAt: parsed.data.recurrenceUntil
        ? combineZonedDate(
            parsed.data.recurrenceUntil,
            parsed.data.startTimeLocal,
            "America/Los_Angeles",
          )
        : null,
      searchDocument: searchDocument([
        parsed.data.title,
        parsed.data.summary,
        parsed.data.description,
        parsed.data.city,
      ]),
    },
  });

  const window = materializationWindow();
  const occurrences = materializeOccurrences({
    rule: recurrenceRule,
    durationMinutes: parsed.data.estimatedDurationMinutes,
    rangeStart: window.from,
    rangeEnd: window.to,
  });

  await prisma.rideOccurrence.createMany({
    data: occurrences.map((occurrence) => ({
      rideSeriesId: ride.id,
      startsAt: occurrence.startsAt,
      endsAt: occurrence.endsAt,
      status: OccurrenceStatus.SCHEDULED,
    })),
  });

  revalidatePath("/organizer");
  revalidatePath("/rides");

  return {
    ok: true,
    message: "Ride draft created.",
  };
}

export async function createEventSeriesAction(
  input: Parameters<typeof eventSeriesSchema.parse>[0],
) {
  const user = await requireOrganizerUser();
  const parsed = eventSeriesSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const permitted = await canManageOrganization(user.id, parsed.data.organizationId);

  if (!permitted) {
    return { ok: false, message: "You cannot manage that organization." };
  }

  const startsAt = combineZonedDate(
    parsed.data.startsAtDate,
    parsed.data.startsAtTime,
    "America/Los_Angeles",
  );
  const endsAt = combineZonedDate(
    parsed.data.endsAtDate,
    parsed.data.endsAtTime,
    "America/Los_Angeles",
  );
  const recurrenceRule =
    parsed.data.isRecurring && parsed.data.recurrenceMode
      ? buildRecurrenceRule({
          frequency: parsed.data.recurrenceMode,
          timezone: "America/Los_Angeles",
          startDate: parsed.data.startsAtDate,
          startTime: parsed.data.startsAtTime,
          interval: parsed.data.recurrenceInterval || 1,
          monthlyWeek: parsed.data.monthlyWeek,
          monthlyWeekday: parsed.data.monthlyWeekday,
          until: parsed.data.endsAtDate,
        })
      : undefined;

  const event = await prisma.eventSeries.create({
    data: {
      organizationId: parsed.data.organizationId,
      slug: slug(parsed.data.title),
      title: parsed.data.title,
      summary: parsed.data.summary,
      description: parsed.data.description,
      city: parsed.data.city,
      eventType: parsed.data.eventType,
      startsAt,
      endsAt,
      locationName: parsed.data.locationName,
      locationAddress: parsed.data.locationAddress,
      registrationUrl: parsed.data.registrationUrl,
      priceText: parsed.data.priceText,
      isRecurring: parsed.data.isRecurring,
      recurrenceRule,
      recurrenceSummary: recurrenceRule ? recurrenceToText(recurrenceRule) : null,
      recurrenceTimezone: "America/Los_Angeles",
      recurrenceEndsAt: recurrenceRule ? endsAt : null,
      searchDocument: searchDocument([
        parsed.data.title,
        parsed.data.summary,
        parsed.data.description,
        parsed.data.city,
      ]),
    },
  });

  const window = materializationWindow();
  const occurrences = recurrenceRule
    ? materializeOccurrences({
        rule: recurrenceRule,
        durationMinutes: Math.max(
          30,
          Math.round((endsAt.getTime() - startsAt.getTime()) / 60000),
        ),
        rangeStart: window.from,
        rangeEnd: window.to,
      })
    : [{ startsAt, endsAt, status: "SCHEDULED" as const }];

  await prisma.eventOccurrence.createMany({
    data: occurrences.map((occurrence) => ({
      eventSeriesId: event.id,
      startsAt: occurrence.startsAt,
      endsAt: occurrence.endsAt,
      status: OccurrenceStatus.SCHEDULED,
    })),
  });

  revalidatePath("/organizer");
  revalidatePath("/events");

  return {
    ok: true,
    message: "Event draft created.",
  };
}

export async function createRouteGuideAction(
  input: Parameters<typeof routeGuideSchema.parse>[0],
) {
  const user = await requireOrganizerUser();
  const parsed = routeGuideSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  if (parsed.data.organizationId) {
    const permitted = await canManageOrganization(user.id, parsed.data.organizationId);

    if (!permitted) {
      return { ok: false, message: "You cannot manage that organization." };
    }
  }

  await prisma.routeGuide.create({
    data: {
      organizationId: parsed.data.organizationId || null,
      slug: slug(parsed.data.title),
      title: parsed.data.title,
      summary: parsed.data.summary,
      description: parsed.data.description,
      city: parsed.data.city,
      distanceMiles: parsed.data.distanceMiles,
      elevationFeet: parsed.data.elevationFeet,
      surface: parsed.data.surface,
      difficulty: DifficultyLevel.MODERATE,
      bestSeason: parsed.data.bestSeason,
      startLocationName: parsed.data.startLocationName,
      startAddress: parsed.data.startAddress,
      routeUrl: parsed.data.routeUrl,
      touristFriendly: parsed.data.touristFriendly,
      beginnerFriendly: parsed.data.beginnerFriendly,
      searchDocument: searchDocument([
        parsed.data.title,
        parsed.data.summary,
        parsed.data.description,
        parsed.data.city,
      ]),
    },
  });

  revalidatePath("/organizer");
  revalidatePath("/routes");

  return {
    ok: true,
    message: "Route guide draft created.",
  };
}
