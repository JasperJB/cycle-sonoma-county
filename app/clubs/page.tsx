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
        title="Clubs, teams, and riding groups"
        description="From race teams to casual group rides."
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
          description="Clubs and groups will show up here."
        />
      )}
    </PageShell>
  );
}
