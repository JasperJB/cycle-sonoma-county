"use server";

import { OrganizationType, SponsorSlot, VerificationStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/permissions";
import {
  forceSendCurrentNewsletterIssue,
  previewCurrentNewsletterIssue,
  saveNewsletterGlobalSection,
  saveNewsletterOrganizationDraft,
} from "@/lib/newsletter";
import {
  newsletterGlobalSectionSchema,
  newsletterOrganizationDraftSchema,
  sponsorPlacementSchema,
} from "@/lib/validators";
import { revalidatePath } from "next/cache";

function organizationPublicPath(type: OrganizationType, slug: string) {
  return type === OrganizationType.SHOP || type === OrganizationType.BIKE_FRIENDLY_BUSINESS
    ? `/shops/${slug}`
    : `/clubs/${slug}`;
}

function revalidatePublicPaths() {
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/shops");
  revalidatePath("/clubs");
  revalidatePath("/rides");
  revalidatePath("/events");
  revalidatePath("/routes");
  revalidatePath("/visitors");
}

export async function previewNewsletterAction() {
  await requireAdminUser();
  const result = await previewCurrentNewsletterIssue();
  revalidatePath("/admin");
  revalidatePath("/admin/newsletter");
  return result;
}

export async function saveNewsletterGlobalSectionAction(input: { content: string }) {
  const admin = await requireAdminUser();
  const parsed = newsletterGlobalSectionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Unable to save the global newsletter section.",
    };
  }

  await saveNewsletterGlobalSection(parsed.data.content);
  revalidatePath("/admin");
  revalidatePath("/admin/newsletter");

  return {
    ok: true,
    message: `Global newsletter section saved by ${admin.email}.`,
  };
}

export async function overrideNewsletterOrganizationDraftAction(input: {
  organizationId: string;
  content: string;
}) {
  const admin = await requireAdminUser();
  const parsed = newsletterOrganizationDraftSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Unable to save the organization override.",
    };
  }

  try {
    await saveNewsletterOrganizationDraft({
      userId: admin.id,
      organizationId: parsed.data.organizationId,
      content: parsed.data.content,
      adminOverride: true,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/newsletter");

    return {
      ok: true,
      message: "Organization newsletter override saved.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to save the organization override.",
    };
  }
}

export async function forceSendNewsletterAction() {
  await requireAdminUser();
  const result = await forceSendCurrentNewsletterIssue();
  revalidatePath("/admin");
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

export async function updateOrganizationVerificationStatusAction(
  organizationId: string,
  verificationStatus: "APPROVED" | "PENDING",
) {
  const admin = await requireAdminUser();
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
    },
  });

  if (!organization) {
    return {
      ok: false,
      message: "Organization not found.",
    };
  }

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: organizationId },
      data: {
        verificationStatus,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: admin.id,
        action: "organization.verification.updated",
        entityType: "Organization",
        entityId: organizationId,
        metadata: {
          organizationName: organization.name,
          verificationStatus,
        },
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePublicPaths();
  revalidatePath(organizationPublicPath(organization.type, organization.slug));

  return {
    ok: true,
    message:
      verificationStatus === VerificationStatus.APPROVED
        ? "Verified badge added."
        : "Verified badge removed.",
  };
}
