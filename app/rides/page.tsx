import { ContentCard, EmptyState } from "@/components/content-card";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { getRides } from "@/lib/data/public";
import { formatOccurrenceStart } from "@/lib/recurrence";

export const revalidate = 900;

export default async function RidesPage() {
  const rides = await getRides();

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Recurring rides"
        title="Weekly rides around Sonoma County"
        description="Road, gravel, mountain, e-bike, and social rides, all in one place."
      />
      {rides.length ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {rides.map((ride) => (
            <ContentCard
              key={ride.id}
              href={`/rides/${ride.slug}`}
              title={ride.title}
              summary={ride.summary}
              eyebrow={ride.organization.name}
              meta={
                ride.occurrences[0]
                  ? formatOccurrenceStart(
                      ride.occurrences[0].startsAt,
                      ride.recurrenceTimezone || undefined,
                    )
                  : ride.recurrenceSummary
              }
              badges={[
                ride.rideType.replace("_", " "),
                ride.dropPolicy.replace("_", "-"),
                ...(ride.needsReconfirmation ? ["Needs reconfirmation"] : []),
              ]}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No ride series are published yet"
          description="Published rides will show up here."
        />
      )}
    </PageShell>
  );
}
