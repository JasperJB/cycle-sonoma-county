import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { EventSeriesForm } from "@/components/forms/event-series-form";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/user";
import { getOrganizationOptionsForUser } from "@/lib/data/dashboard";
import { parseRecurrenceRule } from "@/lib/recurrence";
import { prisma } from "@/lib/prisma";
import { canManageOrganization, hasOrganizerAccess } from "@/lib/permissions";

export default async function EditEventSeriesPage({
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
  const event = await prisma.eventSeries.findUnique({
    where: { id },
  });

  if (!event) {
    notFound();
  }

  const permitted = await canManageOrganization(user.id, event.organizationId);

  if (!permitted) {
    notFound();
  }

  const organizations = await getOrganizationOptionsForUser(user.id);
  const recurrence = event.recurrenceRule ? parseRecurrenceRule(event.recurrenceRule) : null;
  const customStartDate = recurrence?.customDates[0];

  return (
    <PageShell className="gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionHeading
          eyebrow="Organizer console"
          title={`Edit ${event.title}`}
          description="Update event copy, timing, and hosting organization without recreating the listing."
        />
        <Button asChild variant="outline" className="rounded-2xl px-4">
          <Link href="/organizer">Back to organizer</Link>
        </Button>
      </div>
      <section className="surface-card p-6">
        <EventSeriesForm
          organizations={organizations}
          eventSeriesId={event.id}
          initialValues={{
            organizationId: event.organizationId,
            title: event.title,
            summary: event.summary,
            description: event.description || "",
            city: event.city,
            eventType: event.eventType,
            startsAtDate:
              customStartDate ||
              formatInTimeZone(event.startsAt, "America/Los_Angeles", "yyyy-MM-dd"),
            startsAtTime: formatInTimeZone(event.startsAt, "America/Los_Angeles", "HH:mm"),
            durationMinutes: Math.max(
              30,
              Math.round((event.endsAt.getTime() - event.startsAt.getTime()) / 60000),
            ),
            locationName: event.locationName,
            locationAddress: event.locationAddress || "",
            registrationUrl: event.registrationUrl || "",
            priceText: event.priceText || "",
            isRecurring: event.isRecurring,
            recurrenceMode: recurrence?.frequency,
            recurrenceInterval: recurrence?.interval,
            recurrenceUntil: recurrence?.until
              ? formatInTimeZone(recurrence.until, "America/Los_Angeles", "yyyy-MM-dd")
              : "",
            weekdays: recurrence?.weekdays,
            monthlyWeeks: recurrence?.monthlyWeeks,
            monthlyWeekday: recurrence?.monthlyWeekday,
            customDates: recurrence?.customDates,
          }}
          submitLabel="Save event changes"
          redirectTo="/organizer"
        />
      </section>
    </PageShell>
  );
}
