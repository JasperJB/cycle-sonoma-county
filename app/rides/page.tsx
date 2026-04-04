import { ContentCard, EmptyState } from "@/components/content-card";
import { FilterChipNav } from "@/components/filter-chip-nav";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { getRides } from "@/lib/data/public";
import { formatOccurrenceStart } from "@/lib/recurrence";
import { rideFilterLinks } from "@/lib/site";

export const revalidate = 900;

export default async function RidesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const beginnerFriendly = params.beginner === "true";
  const noDrop = params.nodrop === "true";
  const rides = await getRides({ beginnerFriendly, noDrop });
  const title = noDrop
    ? "No-drop rides"
    : beginnerFriendly
      ? "Beginner-friendly rides"
      : "Weekly rides around Sonoma County";
  const description = noDrop
    ? "Group rides that emphasize regrouping and getting everyone home together."
    : beginnerFriendly
      ? "Road, gravel, mountain, e-bike, and social rides that are easier to join for the first time."
      : "Road, gravel, mountain, e-bike, and social rides, all in one place.";

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Rides"
        title={title}
        description={description}
      />
      <FilterChipNav
        ariaLabel="Ride filters"
        items={rideFilterLinks.map((item) => ({
          ...item,
          active:
            (item.href === "/rides" && !beginnerFriendly && !noDrop) ||
            (item.href === "/rides?beginner=true" && beginnerFriendly) ||
            (item.href === "/rides?nodrop=true" && noDrop),
        }))}
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
