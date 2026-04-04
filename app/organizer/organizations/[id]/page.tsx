import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrganizationOnboardingForm } from "@/components/forms/organization-onboarding-form";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";
import { canManageOrganization, hasOrganizerAccess } from "@/lib/permissions";

export default async function EditOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  if (!hasOrganizerAccess(user)) {
    redirect("/organizer");
  }

  const { id } = await params;
  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      shopProfile: true,
    },
  });

  if (!organization) {
    notFound();
  }

  const permitted = await canManageOrganization(user.id, organization.id);

  if (!permitted) {
    notFound();
  }

  return (
    <PageShell className="gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionHeading
          eyebrow="Organizer console"
          title={`Edit ${organization.name}`}
          description="Update the public organization profile, then return to the organizer console to manage publishing."
        />
        <Button asChild variant="outline" className="rounded-2xl px-4">
          <Link href="/organizer">Back to organizer</Link>
        </Button>
      </div>
      <section className="surface-card p-6">
        <OrganizationOnboardingForm
          organizationId={organization.id}
          initialValues={{
            organizationType: organization.type,
            name: organization.name,
            shortDescription: organization.shortDescription,
            description: organization.description || "",
            city: organization.city,
            websiteUrl: organization.websiteUrl || "",
            socialUrl: organization.instagramUrl || "",
            addressLine1: organization.addressLine1 || "",
            offersRentals: organization.shopProfile?.offersRentals || false,
            latitude: organization.latitude || undefined,
            longitude: organization.longitude || undefined,
          }}
          submitLabel="Save organization changes"
          redirectTo="/organizer"
        />
      </section>
    </PageShell>
  );
}
