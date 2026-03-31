import { ExploreExperience } from "@/components/explore/explore-experience";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { getExploreItems } from "@/lib/data/public";

export const revalidate = 900;

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    dataset: (Array.isArray(params.dataset) ? params.dataset[0] : params.dataset) as
      | "all"
      | "shops"
      | "clubs"
      | "rides"
      | "events"
      | "routes"
      | undefined,
    city: Array.isArray(params.city) ? params.city[0] : params.city,
    search: Array.isArray(params.search) ? params.search[0] : params.search,
    verifiedOnly: params.verified === "true",
    beginnerFriendly: params.beginner === "true",
    youthFriendly: params.youth === "true",
    noDrop: params.nodrop === "true",
  };
  const items = await getExploreItems(filters);

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Explore"
        title="Map-first discovery for rides, routes, clubs, shops, and events"
        description="Use server-side filters to narrow the county, then click between the map and list without losing context."
      />
      <form className="surface-card grid gap-4 p-5 lg:grid-cols-6">
        <input
          type="text"
          name="search"
          defaultValue={filters.search}
          placeholder="Search names, cities, disciplines, or organizers"
          className="h-12 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm lg:col-span-2"
        />
        <select
          name="dataset"
          defaultValue={filters.dataset || "all"}
          className="h-12 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
        >
          <option value="all">All listings</option>
          <option value="shops">Shops</option>
          <option value="clubs">Clubs</option>
          <option value="rides">Rides</option>
          <option value="events">Events</option>
          <option value="routes">Routes</option>
        </select>
        <input
          type="text"
          name="city"
          defaultValue={filters.city}
          placeholder="City"
          className="h-12 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
        />
        <label className="flex items-center gap-2 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm text-[var(--color-pine)]">
          <input type="checkbox" name="verified" value="true" defaultChecked={filters.verifiedOnly} />
          Verified only
        </label>
        <button
          type="submit"
          className="h-12 rounded-2xl bg-[var(--color-pine)] px-5 text-sm font-semibold text-white"
        >
          Update map
        </button>
      </form>
      <ExploreExperience items={items} />
    </PageShell>
  );
}
