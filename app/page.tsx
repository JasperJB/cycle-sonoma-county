import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { ArrowRight, Compass, Flag, MapPinned, TentTree, Users } from "lucide-react";
import { ContentCard } from "@/components/content-card";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { HomeHeroCarousel } from "@/components/home-hero-carousel";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getHomePageData } from "@/lib/data/public";
import { formatOccurrenceStart } from "@/lib/recurrence";

export const revalidate = 3600;

const quickLinks = [
  { href: "/rides", label: "Recurring rides", icon: Flag },
  { href: "/clubs", label: "Clubs and teams", icon: Users },
  { href: "/shops", label: "Bike shops", icon: Compass },
  { href: "/events", label: "Events calendar", icon: TentTree },
  { href: "/routes", label: "Route guides", icon: MapPinned },
];

export default async function HomePage() {
  const data = await getHomePageData();

  return (
    <PageShell className="gap-12">
      <section className="hero-glow subtle-grid surface-card relative overflow-hidden px-6 py-8 sm:px-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <Badge className="rounded-full bg-[var(--color-pine)] px-4 py-1 text-[0.72rem] uppercase tracking-[0.24em] text-white">
              Trusted local cycling hub
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-4xl font-heading text-4xl leading-[0.95] text-[var(--color-pine)] sm:text-5xl lg:text-6xl">
                Find friends, rides, routes, shops, and local cycling knowledge for Sonoma
                County.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--color-forest-muted)]">
                Find a ride, a route, a shop, or a local event without digging through
                group chats and scattered posts.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-2xl px-6">
                <Link href="/explore">
                  Explore the county
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-2xl px-6">
                <Link href="/become-organizer">Become an organizer</Link>
              </Button>
            </div>
          </div>
          <HomeHeroCarousel />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="surface-card flex items-center gap-4 rounded-[1.5rem] p-4 hover:border-[color:var(--color-clay)]/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-pine)] text-white">
                <link.icon className="h-5 w-5" />
              </span>
              <span className="font-medium text-[var(--color-pine)]">{link.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <SectionHeading
            eyebrow="This week"
            title="This week"
            description="A quick look at the next rides and events."
          />
          <div className="grid gap-4">
            {[...data.thisWeekRides, ...data.thisWeekEvents]
              .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
              .slice(0, 6)
              .map((item) => {
                const title =
                  "rideSeries" in item ? item.rideSeries.title : item.eventSeries.title;
                const href =
                  "rideSeries" in item
                    ? `/rides/${item.rideSeries.slug}`
                    : `/events/${item.eventSeries.slug}`;
                const owner =
                  "rideSeries" in item
                    ? item.rideSeries.organization.name
                    : item.eventSeries.organization.name;
                const timezone =
                  "rideSeries" in item
                    ? item.rideSeries.recurrenceTimezone || undefined
                    : item.eventSeries.recurrenceTimezone || undefined;

                return (
                  <Link
                    key={item.id}
                    href={href}
                    className="surface-card flex items-start justify-between gap-4 p-5"
                  >
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                        {formatOccurrenceStart(item.startsAt, timezone)}
                      </p>
                      <h3 className="font-heading text-2xl text-[var(--color-pine)]">{title}</h3>
                      <p className="text-sm leading-6 text-[var(--color-forest-muted)]">{owner}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 text-[var(--color-forest-soft)]" />
                  </Link>
                );
              })}
          </div>
        </div>

        <div className="space-y-5">
          <SectionHeading
            eyebrow="Featured"
            title="Good places to start"
            description="A featured shop, club, and route."
          />
          <div className="grid gap-4">
            {data.featuredShop ? (
              <ContentCard
                href={`/shops/${data.featuredShop.slug}`}
                title={data.featuredShop.name}
                summary={data.featuredShop.shortDescription}
                eyebrow="Featured shop"
                meta={data.featuredShop.city}
                badges={data.featuredShop.shopProfile?.serviceCategories.slice(0, 3)}
              />
            ) : null}
            {data.featuredClub ? (
              <ContentCard
                href={`/clubs/${data.featuredClub.slug}`}
                title={data.featuredClub.name}
                summary={data.featuredClub.shortDescription}
                eyebrow="Featured club"
                meta={data.featuredClub.city}
                badges={data.featuredClub.clubProfile?.disciplines.slice(0, 3)}
              />
            ) : null}
            {data.featuredRoute ? (
              <ContentCard
                href={`/routes/${data.featuredRoute.slug}`}
                title={data.featuredRoute.title}
                summary={data.featuredRoute.summary}
                eyebrow="Featured route"
                meta={`${data.featuredRoute.distanceMiles} mi • ${data.featuredRoute.elevationFeet} ft`}
                badges={[data.featuredRoute.surface, data.featuredRoute.bestSeason]}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {data.featuredSponsors.map((placement) => (
          <ContentCard
            key={placement.id}
            href={placement.href}
            title={placement.title}
            summary={placement.blurb || "Featured by the Cycle Sonoma County sponsor program."}
            eyebrow={placement.slot.replace("_", " ")}
            meta={placement.organization?.city || placement.routeGuide?.city}
            badges={[
              ...(placement.organization ? [placement.organization.type.replace("_", " ")] : []),
              ...(placement.routeGuide ? ["Route spotlight"] : []),
            ]}
          />
        ))}
      </section>

      <section className="grid gap-8 rounded-[2rem] border border-[color:var(--color-border-soft)] bg-[color:var(--color-paper-strong)] px-6 py-8 lg:grid-cols-[1fr_0.8fr] lg:px-10">
        <div className="space-y-4">
          <SectionHeading
            eyebrow="Newsletter"
            title="One local cycling email"
            description="Upcoming rides, events, and route picks. No flood of emails."
          />
          <NewsletterForm source="homepage" />
        </div>
        <div className="surface-card space-y-3 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-forest-soft)]">
            Organizer CTA
          </p>
          <h3 className="font-heading text-3xl text-[var(--color-pine)]">
            Run a shop, club, team, or ride series?
          </h3>
          <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
            Get verified, publish your listings, and keep ride details current in one place.
          </p>
          <Button asChild className="rounded-2xl px-5">
            <Link href="/become-organizer">Apply for organizer access</Link>
          </Button>
        </div>
      </section>
      <Analytics />
    </PageShell>
  );
}
