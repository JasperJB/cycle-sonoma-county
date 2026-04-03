import { ContentCard, EmptyState } from "@/components/content-card";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { getShops } from "@/lib/data/public";

export const revalidate = 3600;

export default async function ShopsPage() {
  const shops = await getShops();

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Businesses"
        title="Bike-friendly businesses"
        description="Bike shops, cafes, breweries, and other local stops that make riding better."
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
          title="No bike-friendly businesses are published yet"
          description="Bike shops and other rider-friendly businesses will show up here."
        />
      )}
    </PageShell>
  );
}
