import { ContentCard, EmptyState } from "@/components/content-card";
import { FilterChipNav } from "@/components/filter-chip-nav";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { getShops } from "@/lib/data/public";
import { shopFilterLinks } from "@/lib/site";

export const revalidate = 3600;

export default async function ShopsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rentalsOnly = params.rentals === "true";
  const verifiedOnly = params.verified === "true";
  const shops = await getShops({ rentalsOnly, verifiedOnly });
  const title = rentalsOnly
    ? "Bike rentals"
    : verifiedOnly
      ? "Verified shops & services"
      : "Shops & services";
  const description = rentalsOnly
    ? "Rental-ready bike shops and rider-friendly services for visitors and locals."
    : verifiedOnly
      ? "Approved local bike shops and rider-friendly services you can trust."
      : "Bike shops, rentals, repair, fit, cafes, breweries, and other local stops that make riding better.";

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Shops & Services"
        title={title}
        description={description}
      />
      <FilterChipNav
        ariaLabel="Shops and services filters"
        items={shopFilterLinks.map((item) => ({
          ...item,
          active:
            (item.href === "/shops" && !rentalsOnly && !verifiedOnly) ||
            (item.href === "/shops?rentals=true" && rentalsOnly) ||
            (item.href === "/shops?verified=true" && verifiedOnly),
        }))}
      />
      {shops.length ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {shops.map((shop) => (
            <ContentCard
              key={shop.id}
              href={`/shops/${shop.slug}`}
              title={shop.name}
              summary={shop.shortDescription}
              eyebrow={shop.city}
              meta={shop.shopProfile?.serviceCategories.join(" • ")}
              badges={[
                ...(shop.shopProfile?.offersRentals ? ["Rentals"] : []),
                ...(shop.shopProfile?.offersBikeFit ? ["Bike fit"] : []),
                ...(shop.shopProfile?.supportsEBikes ? ["E-bike support"] : []),
              ]}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No shops or services are published yet"
          description="Bike shops, rentals, and other rider-friendly services will show up here."
        />
      )}
    </PageShell>
  );
}
