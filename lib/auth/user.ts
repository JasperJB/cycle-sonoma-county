import { UserRole } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { applyOrganizationInvitesForEmail } from "@/lib/organization-invites";

function maxRole(left: UserRole, right: UserRole) {
  const order = [UserRole.MEMBER, UserRole.ORGANIZER, UserRole.ADMIN];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}

export function roleFromGroups(groups?: string[]) {
  if (groups?.includes("admin")) {
    return UserRole.ADMIN;
  }

  if (groups?.includes("organizer")) {
    return UserRole.ORGANIZER;
  }

  return UserRole.MEMBER;
}

export async function syncUserFromIdentity(input: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  cognitoSub?: string;
  groups?: string[];
}) {
  const incomingRole = roleFromGroups(input.groups);
  const displayName =
    input.displayName || [input.firstName, input.lastName].filter(Boolean).join(" ") || null;
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: input.firstName || existing.firstName,
          lastName: input.lastName || existing.lastName,
          displayName: displayName || existing.displayName,
          cognitoSub: input.cognitoSub || existing.cognitoSub,
          globalRole: maxRole(existing.globalRole, incomingRole),
          isOrganizerApproved:
            existing.isOrganizerApproved || incomingRole !== UserRole.MEMBER,
          lastLoginAt: new Date(),
        },
      })
    : await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        displayName,
        cognitoSub: input.cognitoSub,
        globalRole: incomingRole,
        isOrganizerApproved: incomingRole !== UserRole.MEMBER,
        lastLoginAt: new Date(),
      },
    });
  const claimedInvites = await applyOrganizationInvitesForEmail(user.id, user.email);

  if (!claimedInvites) {
    return user;
  }

  return prisma.user.findUniqueOrThrow({
    where: { id: user.id },
  });
}

export async function getCurrentUser() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      memberships: {
        include: {
          organization: true,
        },
      },
      verificationRequests: {
        orderBy: { createdAt: "desc" },
      },
      favorites: true,
      follows: true,
    },
  });
}

export function sessionFromUser(user: {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  globalRole: UserRole;
}): SessionUser {
  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    role: user.globalRole,
  };
}
