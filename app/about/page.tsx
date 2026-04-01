import Image from "next/image";

import { PageShell, SectionHeading } from "@/components/page-shell";

export default function AboutPage() {
  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="About / Contact"
        title="Built by someone who grew up riding here"
        description="Cycle Sonoma County is a local project shaped by the roads, trails, race starts, and bike shops that make Sonoma County such a special place to ride."
      />
      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-card space-y-5 p-6 sm:p-8">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Hello, I&apos;m Jasper Bayless</h2>
          <div className="space-y-4 text-sm leading-7 text-[var(--color-forest-muted)] sm:text-base">
            <p>
              I&apos;m a Sonoma County local, born and raised on my bike. I grew up riding in Annadel,
              joined the El Molino MTB team as a freshman, and started racing Grasshoppers soon after.
            </p>
            <p>
              These roads and trails are home to me, and this site is my way of giving something useful
              back to the cycling community that shaped me.
            </p>
            <p>
              I built Cycle Sonoma County to connect people with group rides, clubs, races, route ideas,
              and the awesome local shops that make up the backbone of riding in this county.
            </p>
          </div>
        </div>

        <div className="surface-card overflow-hidden p-3">
          <div className="relative aspect-[1334/1107] overflow-hidden rounded-[1.5rem]">
            <Image
              src="/JasperBayless_cycleSoco.png"
              alt="Jasper Bayless with his bike in Sonoma County."
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Why this exists</h2>
          <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
            Sonoma County has an incredible cycling scene, but the information is often scattered across
            Instagram posts, club pages, shop counters, and word of mouth. This site pulls that local
            knowledge into one place so it&apos;s easier for longtime riders and newcomers alike to find
            their people and their next ride.
          </p>
        </div>

        <div className="surface-card space-y-4 p-6">
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Contact</h2>
          <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
            If you spot something incorrect, want to report an issue, or just have a question, email{" "}
            <a className="font-medium text-[var(--color-pine)]" href="mailto:jasperbayless@gmail.com">
              jasperbayless@gmail.com
            </a>
            .
          </p>
        </div>
      </section>
    </PageShell>
  );
}
