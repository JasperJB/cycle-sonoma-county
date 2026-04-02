import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RouteGuideForm } from "@/components/forms/route-guide-form";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/user";
import { getOrganizationOptionsForUser } from "@/lib/data/dashboard";
import { prisma } from "@/lib/prisma";
import { canManageOrganization, hasOrganizerAccess } from "@/lib/permissions";

export default async function EditRouteGuidePage({
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
  const route = await prisma.routeGuide.findUnique({
    where: { id },
  });

  if (!route) {
    notFound();
  }

  if (route.organizationId) {
    const permitted = await canManageOrganization(user.id, route.organizationId);

    if (!permitted) {
      notFound();
    }
  }

  const organizations = await getOrganizationOptionsForUser(user.id);

  return (
    <PageShell className="gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionHeading
          eyebrow="Organizer console"
          title={`Edit ${route.title}`}
          description="Update route details and its owning organization without recreating the guide."
        />
        <Button asChild variant="outline" className="rounded-2xl px-4">
          <Link href="/organizer">Back to organizer</Link>
        </Button>
      </div>
      <section className="surface-card p-6">
        <RouteGuideForm
          organizations={organizations}
          routeGuideId={route.id}
          initialValues={{
            organizationId: route.organizationId || "",
            title: route.title,
            summary: route.summary,
            description: route.description,
            city: route.city,
            distanceMiles: route.distanceMiles,
            elevationFeet: route.elevationFeet,
            surface: route.surface,
            bestSeason: route.bestSeason,
            startLocationName: route.startLocationName,
            startAddress: route.startAddress || "",
            routeUrl: route.routeUrl || "",
            touristFriendly: route.touristFriendly,
            beginnerFriendly: route.beginnerFriendly,
          }}
          submitLabel="Save route guide changes"
          redirectTo="/organizer"
        />
      </section>
    </PageShell>
  );
}
