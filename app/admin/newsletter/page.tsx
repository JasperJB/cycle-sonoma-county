import { redirect } from "next/navigation";
import { previewNewsletterAction } from "@/app/actions/admin";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

async function previewDigest() {
  "use server";
  await previewNewsletterAction();
}

export default async function AdminNewsletterPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  if (user.globalRole !== "ADMIN") {
    redirect("/account");
  }

  const digests = await prisma.newsletterDigest.findMany({
    orderBy: { digestDate: "desc" },
    take: 10,
  });

  return (
    <PageShell className="gap-8">
      <SectionHeading
        eyebrow="Admin / Newsletter"
        title="Preview and send the site-wide digest"
        description="The daily cron will only send on the configured send day. This page can force a dry-run or real send when provider credentials are available."
      />
      <section className="surface-card flex items-center justify-between gap-4 p-6">
        <div>
          <h2 className="font-heading text-3xl text-[var(--color-pine)]">Generate today’s digest</h2>
          <p className="text-sm leading-7 text-[var(--color-forest-muted)]">
            If no email provider is configured, this stores a preview in dry-run mode.
          </p>
        </div>
        <form action={previewDigest}>
          <Button type="submit" className="rounded-2xl px-5">
            Run preview
          </Button>
        </form>
      </section>
      <section className="grid gap-4">
        {digests.map((digest) => (
          <div key={digest.id} className="surface-card space-y-3 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
              {digest.status}
            </p>
            <h2 className="font-heading text-3xl text-[var(--color-pine)]">{digest.subject}</h2>
            <p className="text-sm text-[var(--color-forest-muted)]">
              Sent count: {digest.sentCount} · Dry run: {digest.dryRun ? "Yes" : "No"}
            </p>
            {digest.previewHtml ? (
              <div
                className="rounded-[1.1rem] border border-[color:var(--color-border-soft)] bg-white/80 p-4"
                dangerouslySetInnerHTML={{ __html: digest.previewHtml }}
              />
            ) : null}
          </div>
        ))}
      </section>
    </PageShell>
  );
}
