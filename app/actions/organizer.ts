"use server";

import { addMinutes } from "date-fns";
import {
  DifficultyLevel,
  ListingStatus,
  OccurrenceStatus,
  OrganizationType,
  OrganizationMembershipRole,
  UserRole,
  VerificationStatus,
} from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  newsletterOrganizationDraftSchema,
  organizationOnboardingSchema,
  organizationInviteSchema,
  rideSeriesSchema,
  eventSeriesSchema,
  routeGuideSchema,
  verificationRequestSchema,
} from "@/lib/validators";
import { saveNewsletterOrganizationDraft } from "@/lib/newsletter";
import {
  canAdministerOrganization,
  canManageOrganization,
  requireAdminUser,
  requireOrganizerUser,
  requireUserRecord,
} from "@/lib/permissions";
import {
  buildOrganizationInviteUrl,
  countOrganizationOwners,
  createOrganizationInviteExpiryDate,
  createOrganizationInviteToken,
  ensureOwnerManagedOrganizations,
  hashOrganizationInviteToken,
} from "@/lib/organization-invites";
import {
  buildRecurrenceRule,
  combineZonedDate,
  materializationWindow,
  materializeOccurrences,
  recurrenceToText,
} from "@/lib/recurrence";
import { resolveMapLocation } from "@/lib/location";
import { revalidatePath } from "next/cache";
import slugify from "slugify";

function slug(value: string) {
  return slugify(value, { lower: true, strict: true });
}

function searchDocument(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function organizationPublicPath(type: OrganizationType, slug: string) {
  return type === OrganizationType.SHOP || type === OrganizationType.BIKE_FRIENDLY_BUSINESS
    ? `/shops/${slug}`
    : `/clubs/${slug}`;
}

function ridePublicPath(slug: string) {
  return `/rides/${slug}`;
}

function eventPublicPath(slug: string) {
  return `/events/${slug}`;
}

function routePublicPath(slug: string) {
  return `/routes/${slug}`;
}

function revalidateGlobalPaths() {
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/organizer");
  revalidatePath("/shops");
  revalidatePath("/clubs");
  revalidatePath("/rides");
  revalidatePath("/events");
  revalidatePath("/routes");
  revalidatePath("/visitors");
}

async function canManageNewsletterOrganization(userId: string, organizationId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { globalRole: true },
  });

  if (user?.globalRole === UserRole.ADMIN) {
    return true;
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      role: {
        in: [OrganizationMembershipRole.OWNER, OrganizationMembershipRole.EDITOR],
      },
    },
    select: { id: true },
  });

  return Boolean(membership);
}

export async function saveNewsletterOrganizationDraftAction(input: {
  organizationId: string;
  content: string;
}) {
  const user = await requireOrganizerUser();
  const parsed = newsletterOrganizationDraftSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Unable to save the newsletter update.",
    };
  }

  const permitted = await canManageNewsletterOrganization(user.id, parsed.data.organizationId);

  if (!permitted) {
    return {
      ok: false,
      message: "Only owners, editors, or admins can update that organization's newsletter note.",
    };
  }

  try {
    const draft = await saveNewsletterOrganizationDraft({
      userId: user.id,
      organizationId: parsed.data.organizationId,
      content: parsed.data.content,
    });

    revalidatePath("/organizer");
    revalidatePath("/admin");
    revalidatePath("/admin/newsletter");

    return {
      ok: true,
      message: "Newsletter update saved.",
      draft: {
        content: draft.content,
        updatedAt: draft.updatedAt,
        updatedAtLabel: draft.updatedAt.toLocaleString("en-US", {
          timeZone: "America/Los_Angeles",
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        lastEditedByName:
          draft.lastEditedBy?.displayName ||
          [draft.lastEditedBy?.firstName, draft.lastEditedBy?.lastName].filter(Boolean).join(" ") ||
          draft.lastEditedBy?.email ||
          user.email,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to save the newsletter update.",
    };
  }
}

function normalizeRideCustomDates(input: { recurrenceMode: "CUSTOM" | "WEEKLY" | "MONTHLY"; customDates: string[] }) {
  if (input.recurrenceMode !== "CUSTOM") {
    return [];
  }

  return [...new Set(input.customDates.filter(Boolean))].sort();
}

function normalizeEventCustomDates(input: {
  isRecurring: boolean;
  recurrenceMode?: "CUSTOM" | "WEEKLY" | "MONTHLY";
  customDates: string[];
}) {
  if (!input.isRecurring || input.recurrenceMode !== "CUSTOM") {
    return [];
  }

  return [...new Set(input.customDates.filter(Boolean))].sort();
}

export async function createVerificationRequestAction(input: {
  organizationName: string;
  organizationType:
    | "SHOP"
    | "BIKE_FRIENDLY_BUSINESS"
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
    | "BIKE_FRIENDLY_BUSINESS"
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
  offersRentals?: boolean;
  latitude?: number;
  longitude?: number;
}) {
  const user = await requireOrganizerUser();
  const parsed = organizationOnboardingSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  let location;

  try {
    location = await resolveMapLocation({
      city: parsed.data.city,
      addressLine1: parsed.data.addressLine1,
      label: "organization",
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to validate the organization location.",
    };
  }

  const organization = await prisma.organization.create({
    data: {
      slug: slug(parsed.data.name),
      name: parsed.data.name,
      type: parsed.data.organizationType,
      shortDescription: parsed.data.shortDescription,
      description: parsed.data.description,
      city: location.city,
      addressLine1: location.addressLine1,
      postalCode: location.postalCode,
      websiteUrl: parsed.data.websiteUrl,
      instagramUrl: parsed.data.socialUrl,
      latitude: location.latitude,
      longitude: location.longitude,
      listingStatus: ListingStatus.DRAFT,
      verificationStatus: VerificationStatus.PENDING,
      searchDocument: searchDocument([
        parsed.data.name,
        parsed.data.shortDescription,
        parsed.data.description,
        location.city,
        location.addressLine1,
        parsed.data.offersRentals ? "rentals" : undefined,
      ]),
      shopProfile:
        (parsed.data.organizationType === OrganizationType.SHOP ||
          parsed.data.organizationType === OrganizationType.BIKE_FRIENDLY_BUSINESS) &&
        parsed.data.offersRentals
          ? {
              create: {
                serviceCategories: ["Rental"],
                brands: [],
                offersRentals: true,
              },
            }
          : undefined,
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
    message: "Organization draft saved. Drafts stay private until you publish them from the organizer console.",
  };
}

export async function updateOrganizationAction(
  organizationId: string,
  input: Parameters<typeof organizationOnboardingSchema.parse>[0],
) {
  const user = await requireOrganizerUser();
  const parsed = organizationOnboardingSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const permitted = await canManageOrganization(user.id, organizationId);

  if (!permitted) {
    return { ok: false, message: "You cannot manage that organization." };
  }

  const existingOrganization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      slug: true,
      type: true,
      shopProfile: {
        select: {
          id: true,
        },
      },
      city: true,
      addressLine1: true,
      postalCode: true,
      latitude: true,
      longitude: true,
      rideSeries: { select: { slug: true } },
      eventSeries: { select: { slug: true } },
      routeGuides: { select: { slug: true } },
    },
  });

  if (!existingOrganization) {
    return { ok: false, message: "Organization not found." };
  }

  let location;

  try {
    location = await resolveMapLocation({
      city: parsed.data.city,
      addressLine1: parsed.data.addressLine1,
      label: "organization",
      existing: {
        city: existingOrganization.city,
        addressLine1: existingOrganization.addressLine1,
        postalCode: existingOrganization.postalCode,
        latitude: existingOrganization.latitude,
        longitude: existingOrganization.longitude,
      },
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to validate the organization location.",
    };
  }

  const updatedOrganization = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      slug: slug(parsed.data.name),
      name: parsed.data.name,
      type: parsed.data.organizationType,
      shortDescription: parsed.data.shortDescription,
      description: parsed.data.description,
      city: location.city,
      addressLine1: location.addressLine1,
      postalCode: location.postalCode,
      websiteUrl: parsed.data.websiteUrl,
      instagramUrl: parsed.data.socialUrl,
      latitude: location.latitude,
      longitude: location.longitude,
      searchDocument: searchDocument([
        parsed.data.name,
        parsed.data.shortDescription,
        parsed.data.description,
        location.city,
        location.addressLine1,
        parsed.data.offersRentals ? "rentals" : undefined,
      ]),
      shopProfile:
        parsed.data.organizationType === OrganizationType.SHOP ||
        parsed.data.organizationType === OrganizationType.BIKE_FRIENDLY_BUSINESS
          ? parsed.data.offersRentals || existingOrganization.shopProfile
            ? {
                upsert: {
                  create: {
                    serviceCategories: parsed.data.offersRentals ? ["Rental"] : [],
                    brands: [],
                    offersRentals: parsed.data.offersRentals,
                  },
                  update: {
                    offersRentals: parsed.data.offersRentals,
                  },
                },
              }
            : undefined
          : undefined,
    },
    select: {
      slug: true,
      type: true,
      rideSeries: { select: { slug: true } },
      eventSeries: { select: { slug: true } },
      routeGuides: { select: { slug: true } },
    },
  });

  revalidateGlobalPaths();
  revalidatePath(organizationPublicPath(existingOrganization.type, existingOrganization.slug));
  revalidatePath(organizationPublicPath(updatedOrganization.type, updatedOrganization.slug));

  for (const ride of [...existingOrganization.rideSeries, ...updatedOrganization.rideSeries]) {
    revalidatePath(ridePublicPath(ride.slug));
  }

  for (const event of [...existingOrganization.eventSeries, ...updatedOrganization.eventSeries]) {
    revalidatePath(eventPublicPath(event.slug));
  }

  for (const route of [...existingOrganization.routeGuides, ...updatedOrganization.routeGuides]) {
    revalidatePath(routePublicPath(route.slug));
  }

  return {
    ok: true,
    message: "Organization updated.",
  };
}

export async function updateOrganizationListingStatusAction(
  organizationId: string,
  listingStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED",
) {
  const user = await requireOrganizerUser();
  const permitted = await canManageOrganization(user.id, organizationId);

  if (!permitted) {
    return { ok: false, message: "You cannot manage that organization." };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      slug: true,
      type: true,
    },
  });

  if (!organization) {
    return { ok: false, message: "Organization not found." };
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      listingStatus,
      publishedAt: listingStatus === ListingStatus.PUBLISHED ? new Date() : null,
    },
  });

  revalidateGlobalPaths();
  revalidatePath(organizationPublicPath(organization.type, organization.slug));

  return {
    ok: true,
    message:
      listingStatus === ListingStatus.PUBLISHED
        ? "Organization published."
        : listingStatus === ListingStatus.ARCHIVED
          ? "Organization archived."
          : "Organization moved back to draft.",
  };
}

export async function deleteOrganizationAction(organizationId: string) {
  const user = await requireOrganizerUser();
  const permitted = await canManageOrganization(user.id, organizationId);

  if (!permitted) {
    return { ok: false, message: "You cannot manage that organization." };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      slug: true,
      type: true,
      rideSeries: { select: { slug: true } },
      eventSeries: { select: { slug: true } },
      routeGuides: { select: { slug: true } },
    },
  });

  if (!organization) {
    return { ok: false, message: "Organization not found." };
  }

  await prisma.organization.delete({
    where: { id: organizationId },
  });

  revalidateGlobalPaths();
  revalidatePath(organizationPublicPath(organization.type, organization.slug));

  for (const ride of organization.rideSeries) {
    revalidatePath(ridePublicPath(ride.slug));
  }

  for (const event of organization.eventSeries) {
    revalidatePath(eventPublicPath(event.slug));
  }

  for (const route of organization.routeGuides) {
    revalidatePath(routePublicPath(route.slug));
  }

  return {
    ok: true,
    message: "Organization deleted.",
  };
}

export async function createOrganizationInviteAction(input: {
  email: string;
  organizationIds: string[];
  role: "OWNER" | "EDITOR" | "CONTRIBUTOR";
}) {
  const user = await requireOrganizerUser();
  const parsed = organizationInviteSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  if (parsed.data.email === user.email.toLowerCase()) {
    return { ok: false, message: "Use another email address when sharing access." };
  }

  const requestedOrganizationIds = [...new Set(parsed.data.organizationIds)];
  const targetOrganizations = await ensureOwnerManagedOrganizations(
    user.id,
    requestedOrganizationIds,
  );

  if (targetOrganizations.length !== requestedOrganizationIds.length) {
    return {
      ok: false,
      message: "You can only share access for organizations you own.",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  const existingMemberships = existingUser
    ? await prisma.organizationMembership.findMany({
        where: {
          userId: existingUser.id,
          organizationId: { in: requestedOrganizationIds },
        },
        select: { organizationId: true },
      })
    : [];
  const alreadyGrantedOrganizationIds = new Set(
    existingMemberships.map((membership) => membership.organizationId),
  );
  const inviteOrganizationIds = requestedOrganizationIds.filter(
    (organizationId) => !alreadyGrantedOrganizationIds.has(organizationId),
  );

  if (!inviteOrganizationIds.length) {
    return {
      ok: false,
      message: "That email already has access to every selected organization.",
    };
  }

  const token = createOrganizationInviteToken();
  const tokenHash = hashOrganizationInviteToken(token);
  const expiresAt = createOrganizationInviteExpiryDate();

  await prisma.$transaction([
    prisma.organizationInvite.updateMany({
      where: {
        email: parsed.data.email,
        organizationId: { in: inviteOrganizationIds },
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    }),
    prisma.organizationInvite.createMany({
      data: inviteOrganizationIds.map((organizationId) => ({
        tokenHash,
        email: parsed.data.email,
        organizationId,
        invitedByUserId: user.id,
        role: parsed.data.role,
        expiresAt,
      })),
    }),
  ]);

  revalidatePath("/organizer");

  const sharedOrganizations = targetOrganizations.filter((organization) =>
    inviteOrganizationIds.includes(organization.id),
  );
  const skippedOrganizations = targetOrganizations.filter((organization) =>
    alreadyGrantedOrganizationIds.has(organization.id),
  );

  return {
    ok: true,
    inviteUrl: buildOrganizationInviteUrl(token),
    sharedOrganizationNames: sharedOrganizations.map((organization) => organization.name),
    skippedOrganizationNames: skippedOrganizations.map((organization) => organization.name),
    message: `Invite link created for ${parsed.data.email}.`,
  };
}

export async function revokeOrganizationInviteAction(inviteId: string) {
  const user = await requireOrganizerUser();
  const invite = await prisma.organizationInvite.findUnique({
    where: { id: inviteId },
    select: {
      id: true,
      organizationId: true,
      acceptedAt: true,
      revokedAt: true,
    },
  });

  if (!invite) {
    return { ok: false, message: "Invite not found." };
  }

  const permitted = await canAdministerOrganization(user.id, invite.organizationId);

  if (!permitted) {
    return { ok: false, message: "Only owners can manage collaborators." };
  }

  if (invite.acceptedAt || invite.revokedAt) {
    return { ok: false, message: "That invite is no longer pending." };
  }

  await prisma.organizationInvite.update({
    where: { id: inviteId },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/organizer");

  return {
    ok: true,
    message: "Invite revoked.",
  };
}

export async function removeOrganizationMembershipAction(membershipId: string) {
  const user = await requireOrganizerUser();
  const membership = await prisma.organizationMembership.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      organizationId: true,
      role: true,
      user: {
        select: {
          email: true,
        },
      },
      organization: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!membership) {
    return { ok: false, message: "Collaborator not found." };
  }

  const permitted = await canAdministerOrganization(user.id, membership.organizationId);

  if (!permitted) {
    return { ok: false, message: "Only owners can manage collaborators." };
  }

  if (membership.role === OrganizationMembershipRole.OWNER) {
    const ownerCount = await countOrganizationOwners(membership.organizationId);

    if (ownerCount <= 1) {
      return {
        ok: false,
        message: `Add another owner before removing ${membership.user.email} from ${membership.organization.name}.`,
      };
    }
  }

  await prisma.organizationMembership.delete({
    where: { id: membershipId },
  });

  revalidatePath("/organizer");

  return {
    ok: true,
    message: "Collaborator removed.",
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

  const customDates = normalizeRideCustomDates(parsed.data);
  const effectiveStartDate =
    parsed.data.recurrenceMode === "CUSTOM" ? customDates[0] : parsed.data.startDate;

  const recurrenceRule = buildRecurrenceRule({
    frequency: parsed.data.recurrenceMode,
    timezone: "America/Los_Angeles",
    startDate: effectiveStartDate,
    startTime: parsed.data.startTimeLocal,
    interval: parsed.data.recurrenceInterval,
    weekdays: parsed.data.weekdays,
    monthlyWeeks: parsed.data.monthlyWeeks,
    monthlyWeekday: parsed.data.monthlyWeekday,
    customDates,
    until: parsed.data.recurrenceUntil,
  });

  let location;

  try {
    location = await resolveMapLocation({
      city: parsed.data.city,
      addressLine1: parsed.data.meetingAddress,
      label: "ride meeting point",
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to validate the ride meeting point.",
    };
  }

  const ride = await prisma.rideSeries.create({
    data: {
      organizationId: parsed.data.organizationId,
      slug: slug(parsed.data.title),
      title: parsed.data.title,
      summary: parsed.data.summary,
      description: parsed.data.description,
      city: location.city,
      rideType: parsed.data.rideType,
      paceLabel: parsed.data.paceLabel,
      dropPolicy: parsed.data.dropPolicy,
      difficulty: DifficultyLevel.MODERATE,
      skillLevel: parsed.data.skillLevel,
      meetingLocationName: parsed.data.meetingLocationName,
      meetingAddress: location.addressLine1,
      latitude: location.latitude,
      longitude: location.longitude,
      startDate: combineZonedDate(
        effectiveStartDate,
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
      recurrenceEndsAt:
        parsed.data.recurrenceMode === "CUSTOM"
          ? customDates.length
            ? combineZonedDate(
                customDates[customDates.length - 1],
                parsed.data.startTimeLocal,
                "America/Los_Angeles",
              )
            : null
          : parsed.data.recurrenceUntil
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
        location.city,
        parsed.data.meetingLocationName,
        location.addressLine1,
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
    message: "Ride draft created. It stays in your organizer console until you publish it.",
  };
}

export async function updateRideSeriesAction(
  rideSeriesId: string,
  input: Parameters<typeof rideSeriesSchema.parse>[0],
) {
  const user = await requireOrganizerUser();
  const parsed = rideSeriesSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const existingRide = await prisma.rideSeries.findUnique({
    where: { id: rideSeriesId },
    select: {
      slug: true,
      organizationId: true,
      city: true,
      meetingAddress: true,
      latitude: true,
      longitude: true,
      organization: {
        select: {
          slug: true,
          type: true,
        },
      },
    },
  });

  if (!existingRide) {
    return { ok: false, message: "Ride series not found." };
  }

  const [canManageExistingOrganization, canManageTargetOrganization] = await Promise.all([
    canManageOrganization(user.id, existingRide.organizationId),
    canManageOrganization(user.id, parsed.data.organizationId),
  ]);

  if (!canManageExistingOrganization || !canManageTargetOrganization) {
    return { ok: false, message: "You cannot manage that ride series." };
  }

  const customDates = normalizeRideCustomDates(parsed.data);
  const effectiveStartDate =
    parsed.data.recurrenceMode === "CUSTOM" ? customDates[0] : parsed.data.startDate;

  const recurrenceRule = buildRecurrenceRule({
    frequency: parsed.data.recurrenceMode,
    timezone: "America/Los_Angeles",
    startDate: effectiveStartDate,
    startTime: parsed.data.startTimeLocal,
    interval: parsed.data.recurrenceInterval,
    weekdays: parsed.data.weekdays,
    monthlyWeeks: parsed.data.monthlyWeeks,
    monthlyWeekday: parsed.data.monthlyWeekday,
    customDates,
    until: parsed.data.recurrenceUntil,
  });

  let location;

  try {
    location = await resolveMapLocation({
      city: parsed.data.city,
      addressLine1: parsed.data.meetingAddress,
      label: "ride meeting point",
      existing: {
        city: existingRide.city,
        addressLine1: existingRide.meetingAddress,
        latitude: existingRide.latitude,
        longitude: existingRide.longitude,
      },
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to validate the ride meeting point.",
    };
  }

  const window = materializationWindow();
  const occurrences = materializeOccurrences({
    rule: recurrenceRule,
    durationMinutes: parsed.data.estimatedDurationMinutes,
    rangeStart: window.from,
    rangeEnd: window.to,
  });

  const updatedRide = await prisma.$transaction(async (tx) => {
    const ride = await tx.rideSeries.update({
      where: { id: rideSeriesId },
      data: {
        organizationId: parsed.data.organizationId,
        slug: slug(parsed.data.title),
        title: parsed.data.title,
        summary: parsed.data.summary,
        description: parsed.data.description,
        city: location.city,
        rideType: parsed.data.rideType,
        paceLabel: parsed.data.paceLabel,
        dropPolicy: parsed.data.dropPolicy,
        difficulty: DifficultyLevel.MODERATE,
        skillLevel: parsed.data.skillLevel,
        meetingLocationName: parsed.data.meetingLocationName,
        meetingAddress: location.addressLine1,
        latitude: location.latitude,
        longitude: location.longitude,
        startDate: combineZonedDate(
          effectiveStartDate,
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
        recurrenceEndsAt:
          parsed.data.recurrenceMode === "CUSTOM"
            ? customDates.length
              ? combineZonedDate(
                  customDates[customDates.length - 1],
                  parsed.data.startTimeLocal,
                  "America/Los_Angeles",
                )
              : null
            : parsed.data.recurrenceUntil
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
          location.city,
          parsed.data.meetingLocationName,
          location.addressLine1,
        ]),
      },
      select: {
        slug: true,
        organization: {
          select: {
            slug: true,
            type: true,
          },
        },
      },
    });

    await tx.rideException.deleteMany({
      where: { rideSeriesId },
    });
    await tx.rideOccurrence.deleteMany({
      where: { rideSeriesId },
    });
    await tx.rideOccurrence.createMany({
      data: occurrences.map((occurrence) => ({
        rideSeriesId,
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        status: OccurrenceStatus.SCHEDULED,
      })),
    });

    return ride;
  });

  revalidateGlobalPaths();
  revalidatePath(ridePublicPath(existingRide.slug));
  revalidatePath(ridePublicPath(updatedRide.slug));
  revalidatePath(organizationPublicPath(existingRide.organization.type, existingRide.organization.slug));
  revalidatePath(organizationPublicPath(updatedRide.organization.type, updatedRide.organization.slug));

  return {
    ok: true,
    message: "Ride series updated.",
  };
}

export async function updateRideSeriesListingStatusAction(
  rideSeriesId: string,
  listingStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED",
) {
  const user = await requireOrganizerUser();
  const ride = await prisma.rideSeries.findUnique({
    where: { id: rideSeriesId },
    select: {
      id: true,
      slug: true,
      organizationId: true,
      organization: {
        select: {
          slug: true,
          type: true,
        },
      },
    },
  });

  if (!ride) {
    return { ok: false, message: "Ride series not found." };
  }

  const permitted = await canManageOrganization(user.id, ride.organizationId);

  if (!permitted) {
    return { ok: false, message: "You cannot manage that ride series." };
  }

  await prisma.rideSeries.update({
    where: { id: rideSeriesId },
    data: {
      listingStatus,
      publishedAt: listingStatus === ListingStatus.PUBLISHED ? new Date() : null,
    },
  });

  revalidateGlobalPaths();
  revalidatePath(ridePublicPath(ride.slug));
  revalidatePath(organizationPublicPath(ride.organization.type, ride.organization.slug));

  return {
    ok: true,
    message:
      listingStatus === ListingStatus.PUBLISHED
        ? "Ride series published."
        : listingStatus === ListingStatus.ARCHIVED
          ? "Ride series archived."
          : "Ride series moved back to draft.",
  };
}

export async function deleteRideSeriesAction(rideSeriesId: string) {
  const user = await requireOrganizerUser();
  const ride = await prisma.rideSeries.findUnique({
    where: { id: rideSeriesId },
    select: {
      slug: true,
      organizationId: true,
      organization: {
        select: {
          slug: true,
          type: true,
        },
      },
    },
  });

  if (!ride) {
    return { ok: false, message: "Ride series not found." };
  }

  const permitted = await canManageOrganization(user.id, ride.organizationId);

  if (!permitted) {
    return { ok: false, message: "You cannot manage that ride series." };
  }

  await prisma.rideSeries.delete({
    where: { id: rideSeriesId },
  });

  revalidateGlobalPaths();
  revalidatePath(ridePublicPath(ride.slug));
  revalidatePath(organizationPublicPath(ride.organization.type, ride.organization.slug));

  return {
    ok: true,
    message: "Ride series deleted.",
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
  const customDates = normalizeEventCustomDates(parsed.data);
  const effectiveStartDate =
    parsed.data.isRecurring && parsed.data.recurrenceMode === "CUSTOM"
      ? customDates[0]
      : parsed.data.startsAtDate;
  const effectiveStartsAt = combineZonedDate(
    effectiveStartDate,
    parsed.data.startsAtTime,
    "America/Los_Angeles",
  );
  const endsAt = addMinutes(effectiveStartsAt, parsed.data.durationMinutes);
  const recurrenceRule =
    parsed.data.isRecurring && parsed.data.recurrenceMode
      ? buildRecurrenceRule({
          frequency: parsed.data.recurrenceMode,
          timezone: "America/Los_Angeles",
          startDate: effectiveStartDate,
          startTime: parsed.data.startsAtTime,
          interval: parsed.data.recurrenceInterval || 1,
          weekdays: parsed.data.weekdays,
          monthlyWeeks: parsed.data.monthlyWeeks,
          monthlyWeekday: parsed.data.monthlyWeekday,
          customDates,
          until: parsed.data.recurrenceUntil,
        })
      : undefined;

  let location;

  try {
    location = await resolveMapLocation({
      city: parsed.data.city,
      addressLine1: parsed.data.locationAddress,
      label: "event location",
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to validate the event location.",
    };
  }

  const event = await prisma.eventSeries.create({
    data: {
      organizationId: parsed.data.organizationId,
      slug: slug(parsed.data.title),
      title: parsed.data.title,
      summary: parsed.data.summary,
      description: parsed.data.description,
      city: location.city,
      eventType: parsed.data.eventType,
      startsAt: effectiveStartsAt,
      endsAt,
      locationName: parsed.data.locationName,
      locationAddress: location.addressLine1,
      latitude: location.latitude,
      longitude: location.longitude,
      registrationUrl: parsed.data.registrationUrl,
      priceText: parsed.data.priceText,
      isRecurring: parsed.data.isRecurring,
      recurrenceRule,
      recurrenceSummary: recurrenceRule ? recurrenceToText(recurrenceRule) : null,
      recurrenceTimezone: "America/Los_Angeles",
      recurrenceEndsAt:
        recurrenceRule
          ? parsed.data.recurrenceMode === "CUSTOM"
            ? customDates.length
              ? combineZonedDate(
                  customDates[customDates.length - 1],
                  parsed.data.startsAtTime,
                  "America/Los_Angeles",
                )
              : null
            : parsed.data.recurrenceUntil
              ? combineZonedDate(
                  parsed.data.recurrenceUntil,
                  parsed.data.startsAtTime,
                  "America/Los_Angeles",
                )
              : null
          : null,
      searchDocument: searchDocument([
        parsed.data.title,
        parsed.data.summary,
        parsed.data.description,
        location.city,
        parsed.data.locationName,
        location.addressLine1,
      ]),
    },
  });

  const window = materializationWindow();
  const occurrences = recurrenceRule
    ? materializeOccurrences({
        rule: recurrenceRule,
        durationMinutes: Math.max(
          30,
          Math.round((endsAt.getTime() - effectiveStartsAt.getTime()) / 60000),
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
    message: "Event draft created. It stays in your organizer console until you publish it.",
  };
}

export async function updateEventSeriesAction(
  eventSeriesId: string,
  input: Parameters<typeof eventSeriesSchema.parse>[0],
) {
  const user = await requireOrganizerUser();
  const parsed = eventSeriesSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const existingEvent = await prisma.eventSeries.findUnique({
    where: { id: eventSeriesId },
    select: {
      slug: true,
      organizationId: true,
      city: true,
      locationAddress: true,
      latitude: true,
      longitude: true,
      organization: {
        select: {
          slug: true,
          type: true,
        },
      },
    },
  });

  if (!existingEvent) {
    return { ok: false, message: "Event series not found." };
  }

  const [canManageExistingOrganization, canManageTargetOrganization] = await Promise.all([
    canManageOrganization(user.id, existingEvent.organizationId),
    canManageOrganization(user.id, parsed.data.organizationId),
  ]);

  if (!canManageExistingOrganization || !canManageTargetOrganization) {
    return { ok: false, message: "You cannot manage that event series." };
  }

  const startsAt = combineZonedDate(
    parsed.data.startsAtDate,
    parsed.data.startsAtTime,
    "America/Los_Angeles",
  );
  const customDates = normalizeEventCustomDates(parsed.data);
  const effectiveStartDate =
    parsed.data.isRecurring && parsed.data.recurrenceMode === "CUSTOM"
      ? customDates[0]
      : parsed.data.startsAtDate;
  const effectiveStartsAt = combineZonedDate(
    effectiveStartDate,
    parsed.data.startsAtTime,
    "America/Los_Angeles",
  );
  const endsAt = addMinutes(effectiveStartsAt, parsed.data.durationMinutes);
  const recurrenceRule =
    parsed.data.isRecurring && parsed.data.recurrenceMode
      ? buildRecurrenceRule({
          frequency: parsed.data.recurrenceMode,
          timezone: "America/Los_Angeles",
          startDate: effectiveStartDate,
          startTime: parsed.data.startsAtTime,
          interval: parsed.data.recurrenceInterval || 1,
          weekdays: parsed.data.weekdays,
          monthlyWeeks: parsed.data.monthlyWeeks,
          monthlyWeekday: parsed.data.monthlyWeekday,
          customDates,
          until: parsed.data.recurrenceUntil,
        })
      : undefined;

  let location;

  try {
    location = await resolveMapLocation({
      city: parsed.data.city,
      addressLine1: parsed.data.locationAddress,
      label: "event location",
      existing: {
        city: existingEvent.city,
        addressLine1: existingEvent.locationAddress,
        latitude: existingEvent.latitude,
        longitude: existingEvent.longitude,
      },
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to validate the event location.",
    };
  }

  const window = materializationWindow();
  const occurrences = recurrenceRule
    ? materializeOccurrences({
        rule: recurrenceRule,
        durationMinutes: Math.max(
          30,
          Math.round((endsAt.getTime() - effectiveStartsAt.getTime()) / 60000),
        ),
        rangeStart: window.from,
        rangeEnd: window.to,
      })
    : [{ startsAt, endsAt, status: "SCHEDULED" as const }];

  const updatedEvent = await prisma.$transaction(async (tx) => {
    const event = await tx.eventSeries.update({
      where: { id: eventSeriesId },
      data: {
        organizationId: parsed.data.organizationId,
        slug: slug(parsed.data.title),
        title: parsed.data.title,
        summary: parsed.data.summary,
        description: parsed.data.description,
        city: location.city,
        eventType: parsed.data.eventType,
        startsAt: effectiveStartsAt,
        endsAt,
        locationName: parsed.data.locationName,
        locationAddress: location.addressLine1,
        latitude: location.latitude,
        longitude: location.longitude,
        registrationUrl: parsed.data.registrationUrl,
        priceText: parsed.data.priceText,
        isRecurring: parsed.data.isRecurring,
        recurrenceRule,
        recurrenceSummary: recurrenceRule ? recurrenceToText(recurrenceRule) : null,
        recurrenceTimezone: "America/Los_Angeles",
        recurrenceEndsAt:
          recurrenceRule
            ? parsed.data.recurrenceMode === "CUSTOM"
              ? customDates.length
                ? combineZonedDate(
                    customDates[customDates.length - 1],
                    parsed.data.startsAtTime,
                    "America/Los_Angeles",
                  )
                : null
              : parsed.data.recurrenceUntil
                ? combineZonedDate(
                    parsed.data.recurrenceUntil,
                    parsed.data.startsAtTime,
                    "America/Los_Angeles",
                  )
                : null
            : null,
        searchDocument: searchDocument([
          parsed.data.title,
          parsed.data.summary,
          parsed.data.description,
          location.city,
          parsed.data.locationName,
          location.addressLine1,
        ]),
      },
      select: {
        slug: true,
        organization: {
          select: {
            slug: true,
            type: true,
          },
        },
      },
    });

    await tx.eventOccurrence.deleteMany({
      where: { eventSeriesId },
    });
    await tx.eventOccurrence.createMany({
      data: occurrences.map((occurrence) => ({
        eventSeriesId,
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        status: OccurrenceStatus.SCHEDULED,
      })),
    });

    return event;
  });

  revalidateGlobalPaths();
  revalidatePath(eventPublicPath(existingEvent.slug));
  revalidatePath(eventPublicPath(updatedEvent.slug));
  revalidatePath(organizationPublicPath(existingEvent.organization.type, existingEvent.organization.slug));
  revalidatePath(organizationPublicPath(updatedEvent.organization.type, updatedEvent.organization.slug));

  return {
    ok: true,
    message: "Event series updated.",
  };
}

export async function updateEventSeriesListingStatusAction(
  eventSeriesId: string,
  listingStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED",
) {
  const user = await requireOrganizerUser();
  const event = await prisma.eventSeries.findUnique({
    where: { id: eventSeriesId },
    select: {
      slug: true,
      organizationId: true,
      organization: {
        select: {
          slug: true,
          type: true,
        },
      },
    },
  });

  if (!event) {
    return { ok: false, message: "Event series not found." };
  }

  const permitted = await canManageOrganization(user.id, event.organizationId);

  if (!permitted) {
    return { ok: false, message: "You cannot manage that event series." };
  }

  await prisma.eventSeries.update({
    where: { id: eventSeriesId },
    data: {
      listingStatus,
      publishedAt: listingStatus === ListingStatus.PUBLISHED ? new Date() : null,
    },
  });

  revalidateGlobalPaths();
  revalidatePath(eventPublicPath(event.slug));
  revalidatePath(organizationPublicPath(event.organization.type, event.organization.slug));

  return {
    ok: true,
    message:
      listingStatus === ListingStatus.PUBLISHED
        ? "Event series published."
        : listingStatus === ListingStatus.ARCHIVED
          ? "Event series archived."
          : "Event series moved back to draft.",
  };
}

export async function deleteEventSeriesAction(eventSeriesId: string) {
  const user = await requireOrganizerUser();
  const event = await prisma.eventSeries.findUnique({
    where: { id: eventSeriesId },
    select: {
      slug: true,
      organizationId: true,
      organization: {
        select: {
          slug: true,
          type: true,
        },
      },
    },
  });

  if (!event) {
    return { ok: false, message: "Event series not found." };
  }

  const permitted = await canManageOrganization(user.id, event.organizationId);

  if (!permitted) {
    return { ok: false, message: "You cannot manage that event series." };
  }

  await prisma.eventSeries.delete({
    where: { id: eventSeriesId },
  });

  revalidateGlobalPaths();
  revalidatePath(eventPublicPath(event.slug));
  revalidatePath(organizationPublicPath(event.organization.type, event.organization.slug));

  return {
    ok: true,
    message: "Event series deleted.",
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

  let location;

  try {
    location = await resolveMapLocation({
      city: parsed.data.city,
      addressLine1: parsed.data.startAddress,
      label: "route start",
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to validate the route start.",
    };
  }

  await prisma.routeGuide.create({
    data: {
      organizationId: parsed.data.organizationId || null,
      slug: slug(parsed.data.title),
      title: parsed.data.title,
      summary: parsed.data.summary,
      description: parsed.data.description,
      city: location.city,
      distanceMiles: parsed.data.distanceMiles,
      elevationFeet: parsed.data.elevationFeet,
      surface: parsed.data.surface,
      difficulty: DifficultyLevel.MODERATE,
      bestSeason: parsed.data.bestSeason,
      startLocationName: parsed.data.startLocationName,
      startAddress: location.addressLine1,
      latitude: location.latitude,
      longitude: location.longitude,
      routeUrl: parsed.data.routeUrl,
      touristFriendly: parsed.data.touristFriendly,
      beginnerFriendly: parsed.data.beginnerFriendly,
      searchDocument: searchDocument([
        parsed.data.title,
        parsed.data.summary,
        parsed.data.description,
        location.city,
        parsed.data.startLocationName,
        location.addressLine1,
      ]),
    },
  });

  revalidatePath("/organizer");
  revalidatePath("/routes");

  return {
    ok: true,
    message: "Route guide draft created. It stays in your organizer console until you publish it.",
  };
}

export async function updateRouteGuideAction(
  routeGuideId: string,
  input: Parameters<typeof routeGuideSchema.parse>[0],
) {
  const user = await requireOrganizerUser();
  const parsed = routeGuideSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const existingRoute = await prisma.routeGuide.findUnique({
    where: { id: routeGuideId },
    select: {
      slug: true,
      organizationId: true,
      city: true,
      startAddress: true,
      latitude: true,
      longitude: true,
      organization: {
        select: {
          slug: true,
          type: true,
        },
      },
    },
  });

  if (!existingRoute) {
    return { ok: false, message: "Route guide not found." };
  }

  const targetOrganizationId = parsed.data.organizationId || null;
  const [canManageExistingOrganization, canManageTargetOrganization] = await Promise.all([
    existingRoute.organizationId
      ? canManageOrganization(user.id, existingRoute.organizationId)
      : Promise.resolve(true),
    targetOrganizationId ? canManageOrganization(user.id, targetOrganizationId) : Promise.resolve(true),
  ]);

  if (!canManageExistingOrganization || !canManageTargetOrganization) {
    return { ok: false, message: "You cannot manage that route guide." };
  }

  let location;

  try {
    location = await resolveMapLocation({
      city: parsed.data.city,
      addressLine1: parsed.data.startAddress,
      label: "route start",
      existing: {
        city: existingRoute.city,
        addressLine1: existingRoute.startAddress,
        latitude: existingRoute.latitude,
        longitude: existingRoute.longitude,
      },
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to validate the route start.",
    };
  }

  const updatedRoute = await prisma.routeGuide.update({
    where: { id: routeGuideId },
    data: {
      organizationId: targetOrganizationId,
      slug: slug(parsed.data.title),
      title: parsed.data.title,
      summary: parsed.data.summary,
      description: parsed.data.description,
      city: location.city,
      distanceMiles: parsed.data.distanceMiles,
      elevationFeet: parsed.data.elevationFeet,
      surface: parsed.data.surface,
      difficulty: DifficultyLevel.MODERATE,
      bestSeason: parsed.data.bestSeason,
      startLocationName: parsed.data.startLocationName,
      startAddress: location.addressLine1,
      latitude: location.latitude,
      longitude: location.longitude,
      routeUrl: parsed.data.routeUrl,
      touristFriendly: parsed.data.touristFriendly,
      beginnerFriendly: parsed.data.beginnerFriendly,
      searchDocument: searchDocument([
        parsed.data.title,
        parsed.data.summary,
        parsed.data.description,
        location.city,
        parsed.data.startLocationName,
        location.addressLine1,
      ]),
    },
    select: {
      slug: true,
      organization: {
        select: {
          slug: true,
          type: true,
        },
      },
    },
  });

  revalidateGlobalPaths();
  revalidatePath(routePublicPath(existingRoute.slug));
  revalidatePath(routePublicPath(updatedRoute.slug));

  if (existingRoute.organization) {
    revalidatePath(
      organizationPublicPath(existingRoute.organization.type, existingRoute.organization.slug),
    );
  }

  if (updatedRoute.organization) {
    revalidatePath(
      organizationPublicPath(updatedRoute.organization.type, updatedRoute.organization.slug),
    );
  }

  return {
    ok: true,
    message: "Route guide updated.",
  };
}

export async function updateRouteGuideListingStatusAction(
  routeGuideId: string,
  listingStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED",
) {
  const user = await requireOrganizerUser();
  const route = await prisma.routeGuide.findUnique({
    where: { id: routeGuideId },
    select: {
      slug: true,
      organizationId: true,
      organization: {
        select: {
          slug: true,
          type: true,
        },
      },
    },
  });

  if (!route) {
    return { ok: false, message: "Route guide not found." };
  }

  if (route.organizationId) {
    const permitted = await canManageOrganization(user.id, route.organizationId);

    if (!permitted) {
      return { ok: false, message: "You cannot manage that route guide." };
    }
  }

  await prisma.routeGuide.update({
    where: { id: routeGuideId },
    data: {
      listingStatus,
      publishedAt: listingStatus === ListingStatus.PUBLISHED ? new Date() : null,
    },
  });

  revalidateGlobalPaths();
  revalidatePath(routePublicPath(route.slug));

  if (route.organization) {
    revalidatePath(organizationPublicPath(route.organization.type, route.organization.slug));
  }

  return {
    ok: true,
    message:
      listingStatus === ListingStatus.PUBLISHED
        ? "Route guide published."
        : listingStatus === ListingStatus.ARCHIVED
          ? "Route guide archived."
          : "Route guide moved back to draft.",
  };
}

export async function deleteRouteGuideAction(routeGuideId: string) {
  const user = await requireOrganizerUser();
  const route = await prisma.routeGuide.findUnique({
    where: { id: routeGuideId },
    select: {
      slug: true,
      organizationId: true,
      organization: {
        select: {
          slug: true,
          type: true,
        },
      },
    },
  });

  if (!route) {
    return { ok: false, message: "Route guide not found." };
  }

  if (route.organizationId) {
    const permitted = await canManageOrganization(user.id, route.organizationId);

    if (!permitted) {
      return { ok: false, message: "You cannot manage that route guide." };
    }
  }

  await prisma.routeGuide.delete({
    where: { id: routeGuideId },
  });

  revalidateGlobalPaths();
  revalidatePath(routePublicPath(route.slug));

  if (route.organization) {
    revalidatePath(organizationPublicPath(route.organization.type, route.organization.slug));
  }

  return {
    ok: true,
    message: "Route guide deleted.",
  };
}
