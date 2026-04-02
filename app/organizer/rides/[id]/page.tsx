import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { RideSeriesForm } from "@/components/forms/ride-series-form";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/user";
import { getOrganizationOptionsForUser } from "@/lib/data/dashboard";
import { parseRecurrenceRule } from "@/lib/recurrence";
import { prisma } from "@/lib/prisma";
import { canManageOrganization, hasOrganizerAccess } from "@/lib/permissions";

export default async function EditRideSeriesPage({
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
  const ride = await prisma.rideSeries.findUnique({
    where: { id },
  });

  if (!ride) {
    notFound();
  }

  const permitted = await canManageOrganization(user.id, ride.organizationId);

  if (!permitted) {
    notFound();
  }

  const organizations = await getOrganizationOptionsForUser(user.id);
  const recurrence = parseRecurrenceRule(ride.recurrenceRule);

  return (
    <PageShell className="gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionHeading
          eyebrow="Organizer console"
          title={`Edit ${ride.title}`}
          description="Update ride details, recurrence, and hosting organization without recreating the series."
        />
        <Button asChild variant="outline" className="rounded-2xl px-4">
          <Link href="/organizer">Back to organizer</Link>
        </Button>
      </div>
      <section className="surface-card p-6">
        <RideSeriesForm
          organizations={organizations}
          rideSeriesId={ride.id}
          initialValues={{
            organizationId: ride.organizationId,
            title: ride.title,
            summary: ride.summary,
            description: ride.description || "",
            city: ride.city,
            rideType: ride.rideType,
            paceLabel: ride.paceLabel,
            dropPolicy: ride.dropPolicy,
            skillLevel: ride.skillLevel || "",
            meetingLocationName: ride.meetingLocationName,
            meetingAddress: ride.meetingAddress || "",
            startDate: formatInTimeZone(ride.startDate, "America/Los_Angeles", "yyyy-MM-dd"),
            startTimeLocal: ride.startTimeLocal,
            estimatedDurationMinutes: ride.estimatedDurationMinutes,
            routeUrl: ride.routeUrl || "",
            beginnerFriendly: ride.beginnerFriendly,
            youthFriendly: ride.youthFriendly,
            recurrenceMode: recurrence.frequency,
            recurrenceInterval: recurrence.interval,
            weekdays: recurrence.weekdays,
            monthlyWeeks: recurrence.monthlyWeeks,
            monthlyWeekday: recurrence.monthlyWeekday,
            recurrenceUntil: recurrence.until
              ? formatInTimeZone(recurrence.until, "America/Los_Angeles", "yyyy-MM-dd")
              : "",
          }}
          submitLabel="Save ride series changes"
          redirectTo="/organizer"
        />
      </section>
    </PageShell>
  );
}
