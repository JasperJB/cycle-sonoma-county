"use server";

import { SponsorSlot } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/permissions";
import { runNewsletterDigest } from "@/lib/newsletter";
import { sponsorPlacementSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function previewNewsletterAction() {
  await requireAdminUser();
  const result = await runNewsletterDigest({ force: true });
  revalidatePath("/admin/newsletter");
  return result;
}

export async function createSponsorPlacementAction(input: {
  title: string;
  blurb?: string;
  href: string;
  priority?: number;
  slot: SponsorSlot;
}) {
  await requireAdminUser();
  const parsed = sponsorPlacementSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid sponsor placement.",
    };
  }

  await prisma.sponsorPlacement.create({
    data: {
      ...parsed.data,
      slot: input.slot,
      isActive: true,
    },
  });

  revalidatePath("/admin");

  return {
    ok: true,
    message: "Sponsor placement created.",
  };
}
