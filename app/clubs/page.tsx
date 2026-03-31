import { ContentCard, EmptyState } from "@/components/content-card";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { getClubs } from "@/lib/data/public";

export const revalidate = 3600;

export default async function ClubsPage() {
  const clubs = await getClubs();

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Clubs and groups"
        title="From race-focused crews to social groups and youth teams"
        description="Official clubs, Strava-based groups, school MTB teams, advocacy collectives, and informal social rides all live in the same local graph."
      />
      {clubs.length ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {clubs.map((club) => (
            <ContentCard
              key={club.id}
              href={`/clubs/${club.slug}`}
              title={club.name}
              summary={club.shortDescription}
              eyebrow={club.city}
              meta={club.clubProfile?.regularScheduleText || club.clubProfile?.membershipInfo || ""}
              badges={[
                ...(club.clubProfile?.disciplines.slice(0, 2) || []),
                ...(club.clubProfile?.youthFocused ? ["Youth"] : []),
              ]}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No clubs are published yet"
          description="Clubs, teams, and social groups appear here after organizers publish their profiles."
        />
      )}
    </PageShell>
  );
}
