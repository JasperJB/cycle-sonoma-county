import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentCard } from "@/components/content-card";
import { FavoriteButton } from "@/components/favorite-button";
import { FollowButton } from "@/components/follow-button";
import { ListingHero } from "@/components/listing-hero";
import { PageShell } from "@/components/page-shell";
import { ReportIssuePanel } from "@/components/report-issue-panel";
import { getShopBySlug } from "@/lib/data/public";
import { formatOccurrenceStart } from "@/lib/recurrence";
import { absoluteUrl, buildMetadata, organizationJsonLd } from "@/lib/seo";

function isBikeShop(type: string) {
  return type === "SHOP";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);

  if (!shop) {
    return buildMetadata({
      title: "Shop not found",
      description: "This shop listing is not currently available.",
      path: `/shops/${slug}`,
    });
  }

  return buildMetadata({
    title: shop.name,
    description: shop.shortDescription,
    path: `/shops/${shop.slug}`,
  });
}

export default async function ShopDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);

  if (!shop) {
    notFound();
  }

  return (
    <PageShell className="gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            organizationJsonLd({
              name: shop.name,
              description: shop.description || shop.shortDescription,
              url: absoluteUrl(`/shops/${shop.slug}`),
              city: shop.city,
              telephone: shop.phone,
            }),
          ),
        }}
      />
      <ListingHero
        eyebrow={isBikeShop(shop.type) ? "Bike shop" : "Bike-friendly business"}
        title={shop.name}
        summary={shop.description || shop.shortDescription}
        location={shop.city}
        badges={[
          ...(shop.shopProfile?.serviceCategories || []),
          ...(shop.shopProfile?.offersRentals ? ["Rentals"] : []),
          ...(shop.verificationStatus === "APPROVED" ? ["Verified"] : []),
        ]}
        actions={
          <>
            <FavoriteButton targetId={shop.id} targetType="SHOP" />
            <FollowButton organizationId={shop.id} />
          </>
        }
      />
      <section className="grid gap-6 lg:items-start lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Business details</h2>
          <dl className="grid gap-4 text-sm leading-7 text-[var(--color-forest-muted)] sm:grid-cols-2 [&_dd]:break-words">
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Address</dt>
              <dd>{shop.addressLine1 || "Location shared on request"}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Website</dt>
              <dd>{shop.websiteUrl || "Not listed"}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Phone</dt>
              <dd>{shop.phone || "Not listed"}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-pine)]">Email</dt>
              <dd>{shop.email || "Not listed"}</dd>
            </div>
          </dl>
          {shop.shopProfile ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-medium text-[var(--color-pine)]">Bike-friendly offerings</p>
                <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
                  {shop.shopProfile.serviceCategories.join(", ")}
                </p>
              </div>
              <div>
                <p className="font-medium text-[var(--color-pine)]">Brands</p>
                <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
                  {shop.shopProfile.brands.join(", ")}
                </p>
              </div>
            </div>
          ) : null}
        </div>
        <ReportIssuePanel targetId={shop.id} targetType="SHOP" />
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        {shop.rideSeries.map((ride) => (
          <ContentCard
            key={ride.id}
            href={`/rides/${ride.slug}`}
            title={ride.title}
            summary={ride.summary}
            eyebrow="Hosted ride"
            meta={
              ride.occurrences[0]
                ? formatOccurrenceStart(
                    ride.occurrences[0].startsAt,
                    ride.recurrenceTimezone || undefined,
                  )
                : ride.recurrenceSummary
            }
            badges={[ride.rideType, ride.dropPolicy]}
          />
        ))}
        {shop.eventSeries.map((event) => (
          <ContentCard
            key={event.id}
            href={`/events/${event.slug}`}
            title={event.title}
            summary={event.summary}
            eyebrow="Hosted event"
            meta={
              event.occurrences[0]
                ? formatOccurrenceStart(
                    event.occurrences[0].startsAt,
                    event.recurrenceTimezone || undefined,
                  )
                : event.priceText || ""
            }
            badges={[event.eventType]}
          />
        ))}
      </section>
    </PageShell>
  );
}
