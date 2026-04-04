import { ContentCard, EmptyState } from "@/components/content-card";
import { FilterChipNav } from "@/components/filter-chip-nav";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { getRoutes } from "@/lib/data/public";
import { routeFilterLinks } from "@/lib/site";

export const revalidate = 3600;

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const beginnerFriendly = params.beginner === "true";
  const routes = await getRoutes({ beginnerFriendly });
  const title = beginnerFriendly ? "Beginner-friendly routes" : "Route ideas for locals and visitors";
  const description = beginnerFriendly
    ? "Route ideas with approachable mileage, surfaces, and logistics for newer riders."
    : "See distance, climbing, surface, and a few helpful notes before you roll out.";

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Route guides"
        title={title}
        description={description}
      />
      <FilterChipNav
        ariaLabel="Route filters"
        items={routeFilterLinks.map((item) => ({
          ...item,
          active:
            (item.href === "/routes" && !beginnerFriendly) ||
            (item.href === "/routes?beginner=true" && beginnerFriendly),
        }))}
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
