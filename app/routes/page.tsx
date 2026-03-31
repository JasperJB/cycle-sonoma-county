import { ContentCard, EmptyState } from "@/components/content-card";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { getRoutes } from "@/lib/data/public";

export const revalidate = 3600;

export default async function RoutesPage() {
  const routes = await getRoutes();

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Route guides"
        title="Curated route ideas for visitors and locals"
        description="Distance, elevation, seasonality, surface, cautions, and whether a route is tourist-friendly or beginner-friendly."
      />
      {routes.length ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {routes.map((route) => (
            <ContentCard
              key={route.id}
              href={`/routes/${route.slug}`}
              title={route.title}
              summary={route.summary}
              eyebrow={route.city}
              meta={`${route.distanceMiles} mi • ${route.elevationFeet} ft`}
              badges={[
                route.surface,
                ...(route.touristFriendly ? ["Visitor-friendly"] : []),
                ...(route.beginnerFriendly ? ["Beginner-friendly"] : []),
              ]}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No route guides are published yet"
          description="Curated visitor and local routes will appear here once organizers and editors publish them."
        />
      )}
    </PageShell>
  );
}
