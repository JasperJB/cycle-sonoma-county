import { addDays } from "date-fns";
import { createHash, randomBytes } from "node:crypto";
import { OrganizationMembershipRole, UserRole } from "@/app/generated/prisma/enums";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const INVITE_EXPIRATION_DAYS = 14;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashOrganizationInviteToken(token: string) {
  return createHash("sha256")
    .update(`${env.AUTH_SECRET}:${token}`)
    .digest("hex");
}

export function createOrganizationInviteToken() {
  return randomBytes(24).toString("base64url");
}

export function buildOrganizationInviteUrl(token: string) {
  return `${env.NEXT_PUBLIC_SITE_URL}/auth/invite/${token}`;
}

export function createOrganizationInviteExpiryDate(reference = new Date()) {
  return addDays(reference, INVITE_EXPIRATION_DAYS);
}

export async function getPendingOrganizationInvitesByToken(token: string) {
  return prisma.organizationInvite.findMany({
    where: {
      tokenHash: hashOrganizationInviteToken(token),
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
        },
      },
      invitedBy: {
        select: {
          displayName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getOrganizationInviteBundle(token: string) {
  const invites = await getPendingOrganizationInvitesByToken(token);

  if (!invites.length) {
    return null;
  }

  const primaryInvite = invites[0];
  const inviterName =
    primaryInvite.invitedBy.displayName ||
    [primaryInvite.invitedBy.firstName, primaryInvite.invitedBy.lastName]
      .filter(Boolean)
      .join(" ") ||
    primaryInvite.invitedBy.email;

  return {
    email: primaryInvite.email,
    role: primaryInvite.role,
    expiresAt: primaryInvite.expiresAt,
    inviterName,
    organizations: invites.map((invite) => invite.organization),
  };
}

export async function applyOrganizationInvitesForEmail(userId: string, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const pendingInvites = await prisma.organizationInvite.findMany({
    where: {
      email: normalizedEmail,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      organizationId: true,
      role: true,
    },
  });

  if (!pendingInvites.length) {
    return false;
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { globalRole: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const invite of pendingInvites) {
      await tx.organizationMembership.upsert({
        where: {
          userId_organizationId: {
            userId,
            organizationId: invite.organizationId,
          },
        },
        update: {},
        create: {
          userId,
          organizationId: invite.organizationId,
          role: invite.role,
        },
      });
    }

    if (user.globalRole !== UserRole.ADMIN) {
      await tx.user.update({
        where: { id: userId },
        data: {
          isOrganizerApproved: true,
          globalRole: UserRole.ORGANIZER,
        },
      });
    }

    await tx.organizationInvite.updateMany({
      where: {
        id: { in: pendingInvites.map((invite) => invite.id) },
      },
      data: {
        acceptedAt: new Date(),
        acceptedByUserId: userId,
      },
    });
  });

  return true;
}

export async function acceptOrganizationInvitesByToken(input: {
  token: string;
  userId: string;
  email: string;
}) {
  const invites = await prisma.organizationInvite.findMany({
    where: {
      tokenHash: hashOrganizationInviteToken(input.token),
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      email: true,
      organizationId: true,
      role: true,
    },
  });

  if (!invites.length) {
    return { ok: false as const, message: "That invitation is no longer available." };
  }

  const normalizedEmail = normalizeEmail(input.email);
  if (invites[0].email !== normalizedEmail) {
    return {
      ok: false as const,
      message: "Sign in with the invited email address to accept this access.",
    };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { globalRole: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const invite of invites) {
      await tx.organizationMembership.upsert({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: invite.organizationId,
          },
        },
        update: {},
        create: {
          userId: input.userId,
          organizationId: invite.organizationId,
          role: invite.role,
        },
      });
    }

    if (user.globalRole !== UserRole.ADMIN) {
      await tx.user.update({
        where: { id: input.userId },
        data: {
          isOrganizerApproved: true,
          globalRole: UserRole.ORGANIZER,
        },
      });
    }

    await tx.organizationInvite.updateMany({
      where: {
        id: { in: invites.map((invite) => invite.id) },
      },
      data: {
        acceptedAt: new Date(),
        acceptedByUserId: input.userId,
      },
    });
  });

  return { ok: true as const };
}

export async function ensureOwnerManagedOrganizations(userId: string, organizationIds: string[]) {
  const uniqueOrganizationIds = [...new Set(organizationIds)];

  if (!uniqueOrganizationIds.length) {
    return [];
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { globalRole: true },
  });

  if (user?.globalRole === UserRole.ADMIN) {
    return prisma.organization.findMany({
      where: { id: { in: uniqueOrganizationIds } },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });
  }

  return prisma.organization.findMany({
    where: {
      id: { in: uniqueOrganizationIds },
      memberships: {
        some: {
          userId,
          role: OrganizationMembershipRole.OWNER,
        },
      },
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });
}

export async function countOrganizationOwners(organizationId: string) {
  return prisma.organizationMembership.count({
    where: {
      organizationId,
      role: OrganizationMembershipRole.OWNER,
    },
  });
}
