import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/favorite-button";
import { FollowButton } from "@/components/follow-button";
import { ListingHero } from "@/components/listing-hero";
import { PageShell } from "@/components/page-shell";
import { ReportIssuePanel } from "@/components/report-issue-panel";
import { getEventBySlug } from "@/lib/data/public";
import { formatOccurrenceRange, formatOccurrenceStart } from "@/lib/recurrence";
import { absoluteUrl, buildMetadata, eventJsonLd } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    return buildMetadata({
      title: "Event not found",
      description: "This event listing is not currently available.",
      path: `/events/${slug}`,
    });
  }

  return buildMetadata({
    title: event.title,
    description: event.summary,
    path: `/events/${event.slug}`,
  });
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const timezone = event.recurrenceTimezone || undefined;

  return (
    <PageShell className="gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            eventJsonLd({
              name: event.title,
              description: event.description || event.summary,
              url: absoluteUrl(`/events/${event.slug}`),
              startDate: event.occurrences[0]?.startsAt.toISOString() || event.startsAt.toISOString(),
              endDate: event.occurrences[0]?.endsAt.toISOString() || event.endsAt.toISOString(),
              city: event.city,
              locationName: event.locationName,
            }),
          ),
        }}
      />
      <ListingHero
        eyebrow="Event"
        title={event.title}
        summary={event.description || event.summary}
        location={`${event.city} - ${event.locationName}`}
        badges={[
          event.eventType.replaceAll("_", " "),
          ...(event.priceText ? [event.priceText] : []),
          ...(event.isRecurring ? ["Recurring"] : ["One-off"]),
        ]}
        actions={
          <>
            <FavoriteButton targetId={event.id} targetType="EVENT" />
            <FollowButton organizationId={event.organizationId} />
          </>
        }
      />
      <section className="grid gap-6 lg:items-start lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Event details</h2>
          <dl className="grid gap-4 text-sm leading-7 text-[var(--color-forest-muted)] sm:grid-cols-2 [&_dd]:break-words">
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Organizer</dt>
              <dd>{event.organization.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Registration</dt>
              <dd>{event.registrationUrl || "See organizer for registration"}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Schedule</dt>
              <dd>
                {event.recurrenceSummary || formatOccurrenceStart(event.startsAt, timezone)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Price</dt>
              <dd>{event.priceText || "See organizer"}</dd>
            </div>
          </dl>
          <div>
            <p className="font-medium text-[var(--color-pine)]">Upcoming occurrences</p>
            <ul className="mt-3 space-y-3 text-sm text-[var(--color-forest-muted)]">
              {event.occurrences.map((occurrence) => (
                <li
                  key={occurrence.id}
                  className="rounded-[1.1rem] border border-[color:var(--color-border-soft)] bg-white/70 px-4 py-3"
                >
                  {formatOccurrenceRange(occurrence.startsAt, occurrence.endsAt, timezone)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ReportIssuePanel targetId={event.id} targetType="EVENT" />
      </section>
    </PageShell>
  );
}
