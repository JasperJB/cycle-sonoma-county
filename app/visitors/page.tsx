import { ContentCard } from "@/components/content-card";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { getVisitorPageData } from "@/lib/data/public";
import { formatOccurrenceStart } from "@/lib/recurrence";

export const revalidate = 3600;

export default async function VisitorsPage() {
  const data = await getVisitorPageData();

  return (
    <PageShell className="gap-10">
      <SectionHeading
        eyebrow="For Visitors"
        title="Start here if you're visiting"
        description="A few good routes, shops, rides, and local tips."
      />
      <section className="grid gap-5 lg:grid-cols-3">
        {data.routes.map((route) => (
          <ContentCard
            key={route.id}
            href={`/routes/${route.slug}`}
            title={route.title}
            summary={route.summary}
            eyebrow="Where to start"
            meta={`${route.distanceMiles} mi • ${route.elevationFeet} ft`}
            badges={[route.bestSeason, route.surface]}
          />
        ))}
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="surface-card space-y-4 p-6">
          <SectionHeading
            eyebrow="Rental-friendly shops"
            title="Need a rental or quick help?"
            description="These shops are visitor-friendly."
          />
          <div className="grid gap-3">
            {data.shops.map((shop) => (
              <ContentCard
                key={shop.id}
                href={`/shops/${shop.slug}`}
                title={shop.name}
                summary={shop.shortDescription}
                meta={shop.city}
                badges={shop.shopProfile?.serviceCategories.slice(0, 3)}
              />
            ))}
          </div>
        </div>
        <div className="surface-card space-y-4 p-6">
          <SectionHeading
            eyebrow="Beginner-friendly rides"
            title="Looking for an easy group ride?"
            description="These rides are marked no-drop or beginner-friendly."
          />
          <div className="grid gap-3">
            {data.rides.map((ride) => (
              <ContentCard
                key={ride.id}
                href={`/rides/${ride.slug}`}
                title={ride.title}
                summary={ride.summary}
                meta={
                  ride.occurrences[0]
                    ? formatOccurrenceStart(
                        ride.occurrences[0].startsAt,
                        ride.recurrenceTimezone || undefined,
                      )
                    : ride.organization.name
                }
                badges={[ride.organization.name, ride.rideType]}
              />
            ))}
          </div>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-card space-y-4 p-6">
          <SectionHeading
            eyebrow="Seasonal note"
            title="Seasonal notes"
            description={data.seasonalNote}
          />
          <ul className="space-y-3 text-sm leading-7 text-[var(--color-forest-muted)]">
            <li>Start coastal routes earlier than you think. Wind typically builds into the afternoon.</li>
            <li>Carry lights even for daytime rides if your route uses shaded valleys or fog-prone corridors.</li>
            <li>Wave, call your passes, and leave trailheads cleaner than you found them.</li>
          </ul>
        </div>
        <div className="surface-card space-y-4 p-6">
          <SectionHeading
            eyebrow="Stay in the loop"
            title="Get the weekend email"
            description="Route ideas, rides, and events in one note."
          />
          <NewsletterForm source="visitors" />
          <div className="grid gap-3">
            {data.events.map((event) => (
              <ContentCard
                key={event.id}
                href={`/events/${event.slug}`}
                title={event.title}
                summary={event.summary}
                meta={
                  event.occurrences[0]
                    ? formatOccurrenceStart(
                        event.occurrences[0].startsAt,
                        event.recurrenceTimezone || undefined,
                        "EEE, MMM d",
                      )
                    : ""
                }
                badges={[event.organization.name, event.eventType]}
              />
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
