import { UserRole } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getSession, type SessionUser } from "@/lib/auth/session";

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
  displayName?: string | null;
  cognitoSub?: string;
  groups?: string[];
}) {
  const incomingRole = roleFromGroups(input.groups);
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!existing) {
    return prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        displayName: input.displayName,
        cognitoSub: input.cognitoSub,
        globalRole: incomingRole,
        isOrganizerApproved: incomingRole !== UserRole.MEMBER,
        lastLoginAt: new Date(),
      },
    });
  }

  return prisma.user.update({
    where: { id: existing.id },
    data: {
      displayName: input.displayName || existing.displayName,
      cognitoSub: input.cognitoSub || existing.cognitoSub,
      globalRole: maxRole(existing.globalRole, incomingRole),
      lastLoginAt: new Date(),
    },
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
  displayName?: string | null;
  globalRole: UserRole;
}): SessionUser {
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.globalRole,
  };
}
