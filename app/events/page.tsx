import { ContentCard, EmptyState } from "@/components/content-card";
import { EventType } from "@/app/generated/prisma/enums";
import { FilterChipNav } from "@/components/filter-chip-nav";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { getEvents } from "@/lib/data/public";
import { formatOccurrenceStart } from "@/lib/recurrence";
import { eventFilterLinks } from "@/lib/site";

export const revalidate = 900;

const featuredEventTypes = new Set<EventType>([
  EventType.RACE,
  EventType.FONDO,
  EventType.CLINIC,
]);

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const typeParam = Array.isArray(params.type) ? params.type[0] : params.type;
  const eventType = featuredEventTypes.has(typeParam as EventType)
    ? (typeParam as EventType)
    : undefined;
  const events = await getEvents({ eventType });
  const title =
    eventType === EventType.RACE
      ? "Race events"
      : eventType === EventType.FONDO
        ? "Fondos"
        : eventType === EventType.CLINIC
          ? "Clinics and skills sessions"
          : "Upcoming cycling events";
  const description =
    eventType === EventType.RACE
      ? "Competitive road, gravel, and mountain bike race calendars around Sonoma County."
      : eventType === EventType.FONDO
        ? "Long-format community events and big-day rides worth planning around."
        : eventType === EventType.CLINIC
          ? "Skills sessions, how-to events, and rider education opportunities."
          : "Fondos, clinics, youth events, trail days, swap meets, and more.";

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Events"
        title={title}
        description={description}
      />
      <FilterChipNav
        ariaLabel="Event filters"
        items={eventFilterLinks.map((item) => ({
          ...item,
          active:
            (item.href === "/events" && !eventType) ||
            (item.href === "/events?type=RACE" && eventType === EventType.RACE) ||
            (item.href === "/events?type=FONDO" && eventType === EventType.FONDO) ||
            (item.href === "/events?type=CLINIC" && eventType === EventType.CLINIC),
        }))}
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
          description="Events will show up here."
        />
      )}
    </PageShell>
  );
}
