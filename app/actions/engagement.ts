"use server";

import { NewsletterStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { newsletterSchema, reportSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function subscribeNewsletterAction(input: {
  email: string;
  source?: string;
}) {
  const parsed = newsletterSchema.safeParse(input);
  const session = await getSession();
  const linkedUser = session
    ? { id: session.userId }
    : await prisma.user.findUnique({
        where: { email: parsed.success ? parsed.data.email : input.email.trim().toLowerCase() },
        select: { id: true },
      });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Please enter a valid email.",
    };
  }

  await prisma.newsletterSubscriber.upsert({
    where: { email: parsed.data.email },
    update: {
      status: NewsletterStatus.ACTIVE,
      userId: linkedUser?.id,
      source: input.source || "site",
      unsubscribedAt: null,
    },
    create: {
      email: parsed.data.email,
      userId: linkedUser?.id,
      status: NewsletterStatus.ACTIVE,
      source: input.source || "site",
    },
  });

  revalidatePath("/newsletter");

  return {
    ok: true,
    message: "You are subscribed to the Cycle Sonoma County newsletter.",
  };
}

export async function submitReportAction(input: {
  targetType: "SHOP" | "CLUB" | "RIDE" | "EVENT" | "ROUTE";
  targetId: string;
  reason:
    | "INCORRECT_INFO"
    | "CANCELED_RIDE"
    | "INACTIVE_CLUB"
    | "DUPLICATE_LISTING"
    | "OTHER";
  description: string;
  reporterEmail?: string;
}) {
  const parsed = reportSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Unable to submit the report.",
    };
  }

  const session = await getSession();

  await prisma.report.create({
    data: {
      ...parsed.data,
      reporterUserId: session?.userId,
      reporterEmail: parsed.data.reporterEmail || session?.email,
    },
  });

  revalidatePath("/admin");

  return {
    ok: true,
    message: "Report submitted. An admin will review it.",
  };
}

export async function toggleFavoriteAction(input: {
  targetType: "SHOP" | "CLUB" | "RIDE" | "EVENT" | "ROUTE";
  targetId: string;
}) {
  const session = await getSession();

  if (!session) {
    return { ok: false, message: "Sign in to save favorites." };
  }

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_targetType_targetId: {
        userId: session.userId,
        targetType: input.targetType,
        targetId: input.targetId,
      },
    },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({
      data: {
        userId: session.userId,
        targetType: input.targetType,
        targetId: input.targetId,
      },
    });
  }

  revalidatePath("/account");

  return {
    ok: true,
    favorite: !existing,
  };
}

export async function toggleFollowOrganizationAction(organizationId: string) {
  const session = await getSession();

  if (!session) {
    return { ok: false, message: "Sign in to follow organizations." };
  }

  const existing = await prisma.follow.findUnique({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId,
      },
    },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({
      data: {
        userId: session.userId,
        organizationId,
      },
    });
  }

  revalidatePath("/account");

  return {
    ok: true,
    following: !existing,
  };
}
