import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentCard } from "@/components/content-card";
import { FollowButton } from "@/components/follow-button";
import { ReportForm } from "@/components/forms/report-form";
import { ListingHero } from "@/components/listing-hero";
import { PageShell } from "@/components/page-shell";
import { getClubBySlug } from "@/lib/data/public";
import { absoluteUrl, buildMetadata, organizationJsonLd } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const club = await getClubBySlug(slug);

  if (!club) {
    return buildMetadata({
      title: "Club not found",
      description: "This club listing is not currently available.",
      path: `/clubs/${slug}`,
    });
  }

  return buildMetadata({
    title: club.name,
    description: club.shortDescription,
    path: `/clubs/${club.slug}`,
  });
}

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);

  if (!club) {
    notFound();
  }

  return (
    <PageShell className="gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            organizationJsonLd({
              name: club.name,
              description: club.description || club.shortDescription,
              url: absoluteUrl(`/clubs/${club.slug}`),
              city: club.city,
            }),
          ),
        }}
      />
      <ListingHero
        eyebrow="Club / Group / Team"
        title={club.name}
        summary={club.description || club.shortDescription}
        location={club.city}
        badges={[
          ...(club.clubProfile?.disciplines || []),
          ...(club.clubProfile?.youthFocused ? ["Youth"] : []),
          ...(club.verificationStatus === "APPROVED" ? ["Verified"] : []),
        ]}
        actions={<FollowButton organizationId={club.id} />}
      />
      <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">About this group</h2>
          <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
            {club.clubProfile?.whoItsFor || club.description || club.shortDescription}
          </p>
          <dl className="grid gap-4 text-sm leading-7 text-[var(--color-forest-muted)] sm:grid-cols-2">
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Membership</dt>
              <dd>{club.clubProfile?.membershipInfo || "See organizer profile"}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Regular rhythm</dt>
              <dd>{club.clubProfile?.regularScheduleText || "Varies by season"}</dd>
            </div>
          </dl>
        </div>
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Report incorrect info</h2>
          <ReportForm targetId={club.id} targetType="CLUB" />
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        {club.rideSeries.map((ride) => (
          <ContentCard
            key={ride.id}
            href={`/rides/${ride.slug}`}
            title={ride.title}
            summary={ride.summary}
            eyebrow="Related ride"
            meta={ride.recurrenceSummary}
            badges={[ride.rideType, ride.dropPolicy]}
          />
        ))}
        {club.eventSeries.map((event) => (
          <ContentCard
            key={event.id}
            href={`/events/${event.slug}`}
            title={event.title}
            summary={event.summary}
            eyebrow="Related event"
            meta={event.priceText || event.eventType}
            badges={[event.eventType]}
          />
        ))}
      </section>
    </PageShell>
  );
}
