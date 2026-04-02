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
        title="Route ideas for locals and visitors"
        description="See distance, climbing, surface, and a few helpful notes before you roll out."
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
          description="Route guides will show up here."
        />
      )}
    </PageShell>
  );
}
