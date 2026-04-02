import { ContentCard, EmptyState } from "@/components/content-card";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { getEvents } from "@/lib/data/public";
import { formatOccurrenceStart } from "@/lib/recurrence";

export const revalidate = 900;

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Events"
        title="One-off events and recurring calendars, kept separate from rides"
        description="Fondos, clinics, youth events, trail work days, swap meets, advocacy meetings, and local festivals live here with their own event-specific detail pages."
      />
      {events.length ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {events.map((event) => {
            const timezone = event.recurrenceTimezone || undefined;

            return (
              <ContentCard
                key={event.id}
                href={`/events/${event.slug}`}
                title={event.title}
                summary={event.summary}
                eyebrow={event.organization.name}
                meta={
                  event.occurrences[0]
                    ? formatOccurrenceStart(event.occurrences[0].startsAt, timezone)
                    : formatOccurrenceStart(event.startsAt, timezone)
                }
                badges={[event.eventType.replaceAll("_", " "), event.priceText || "Details"]}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No events are published yet"
          description="Verified organizers can publish events separately from recurring ride series."
        />
      )}
    </PageShell>
  );
}
