import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/favorite-button";
import { FollowButton } from "@/components/follow-button";
import { ListingHero } from "@/components/listing-hero";
import { PageShell } from "@/components/page-shell";
import { ReportIssuePanel } from "@/components/report-issue-panel";
import { getRideBySlug } from "@/lib/data/public";
import { formatDateInTimezone, formatOccurrenceRange } from "@/lib/recurrence";

export default async function RideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ride = await getRideBySlug(slug);

  if (!ride) {
    notFound();
  }

  const timezone = ride.recurrenceTimezone || undefined;

  return (
    <PageShell className="gap-8">
      <ListingHero
        eyebrow="Recurring ride"
        title={ride.title}
        summary={ride.description || ride.summary}
        location={`${ride.city} - ${ride.meetingLocationName}`}
        badges={[
          ride.rideType,
          ride.dropPolicy.replace("_", "-"),
          ...(ride.beginnerFriendly ? ["Beginner-friendly"] : []),
          ...(ride.youthFriendly ? ["Youth-friendly"] : []),
          ...(ride.needsReconfirmation ? ["Possibly stale"] : []),
        ]}
        actions={
          <>
            <FavoriteButton targetId={ride.id} targetType="RIDE" />
            <FollowButton organizationId={ride.organizationId} />
          </>
        }
      />
      <section className="grid gap-6 lg:items-start lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Ride details</h2>
          <dl className="grid gap-4 text-sm leading-7 text-[var(--color-forest-muted)] sm:grid-cols-2 [&_dd]:break-words">
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Organizer</dt>
              <dd>{ride.organization.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Schedule</dt>
              <dd>{ride.recurrenceSummary}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Pace</dt>
              <dd>{ride.paceLabel}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Rain policy</dt>
              <dd>{ride.rainPolicy || "Organizer discretion"}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Skill</dt>
              <dd>{ride.skillLevel || "See summary"}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Last confirmed</dt>
              <dd>
                {ride.lastConfirmedAt
                  ? formatDateInTimezone(ride.lastConfirmedAt, timezone)
                  : "Not confirmed yet"}
              </dd>
            </div>
          </dl>
          <div>
            <p className="font-medium text-[var(--color-pine)]">Upcoming occurrences</p>
            <ul className="mt-3 space-y-3 text-sm text-[var(--color-forest-muted)]">
              {ride.occurrences.map((occurrence) => (
                <li
                  key={occurrence.id}
                  className="rounded-[1.1rem] border border-[color:var(--color-border-soft)] bg-white/70 px-4 py-3"
                >
                  {formatOccurrenceRange(
                    occurrence.startsAt,
                    occurrence.endsAt,
                    timezone,
                  )}{" "}
                  {occurrence.status !== "SCHEDULED"
                    ? `(${occurrence.status.toLowerCase()})`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ReportIssuePanel targetId={ride.id} targetType="RIDE" />
      </section>
    </PageShell>
  );
}
