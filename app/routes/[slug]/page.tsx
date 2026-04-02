import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/favorite-button";
import { FollowButton } from "@/components/follow-button";
import { ListingHero } from "@/components/listing-hero";
import { PageShell } from "@/components/page-shell";
import { ReportIssuePanel } from "@/components/report-issue-panel";
import { getRouteBySlug } from "@/lib/data/public";

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const route = await getRouteBySlug(slug);

  if (!route) {
    notFound();
  }

  return (
    <PageShell className="gap-8">
      <ListingHero
        eyebrow="Route guide"
        title={route.title}
        summary={route.description}
        location={`${route.city} • ${route.startLocationName}`}
        badges={[
          `${route.distanceMiles} mi`,
          `${route.elevationFeet} ft`,
          route.surface,
          ...(route.touristFriendly ? ["Visitor-friendly"] : []),
          ...(route.beginnerFriendly ? ["Beginner-friendly"] : []),
        ]}
        actions={
          <>
            <FavoriteButton targetId={route.id} targetType="ROUTE" />
            {route.organizationId ? <FollowButton organizationId={route.organizationId} /> : null}
          </>
        }
      />
      <section className="grid gap-6 lg:items-start lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Route details</h2>
          <dl className="grid gap-4 text-sm leading-7 text-[var(--color-forest-muted)] sm:grid-cols-2 [&_dd]:break-words">
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Best season</dt>
              <dd>{route.bestSeason}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Start</dt>
              <dd>{route.startAddress || route.startLocationName}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Route link</dt>
              <dd>{route.routeUrl || "See listing details"}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Published by</dt>
              <dd>{route.organization?.name || "Cycle Sonoma County editorial"}</dd>
            </div>
          </dl>
          <div>
            <p className="font-medium text-[var(--color-pine)]">Cautions</p>
            <p className="mt-2 text-sm leading-7 text-[var(--color-forest-muted)]">
              {route.cautions || "Use normal local-road caution and bring lights for variable conditions."}
            </p>
          </div>
        </div>
        <ReportIssuePanel targetId={route.id} targetType="ROUTE" />
      </section>
    </PageShell>
  );
}
