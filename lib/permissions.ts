import { UserRole } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/user";
import { requireSession } from "@/lib/auth/session";

export async function requireUserRecord() {
  await requireSession();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User record not found");
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireUserRecord();

  if (user.globalRole !== UserRole.ADMIN) {
    throw new Error("Admin access required");
  }

  return user;
}

export function hasOrganizerAccess(user: {
  globalRole: UserRole;
  isOrganizerApproved: boolean;
}) {
  return user.globalRole === UserRole.ADMIN || user.isOrganizerApproved;
}

export async function requireOrganizerUser() {
  const user = await requireUserRecord();

  if (!hasOrganizerAccess(user)) {
    throw new Error("Organizer access required");
  }

  return user;
}

export async function canManageOrganization(userId: string, organizationId: string) {
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
    },
  });

  return Boolean(membership);
}
