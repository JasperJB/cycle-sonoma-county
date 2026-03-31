import { SignInForm } from "@/components/forms/signin-form";
import { PageShell, SectionHeading } from "@/components/page-shell";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const email = Array.isArray(params.email) ? params.email[0] : params.email;
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;

  return (
    <PageShell className="justify-center py-12">
      <section className="grid gap-8 lg:grid-cols-[1fr_0.92fr] lg:items-center">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-forest-soft)]">
            Account access
          </p>
          <h1 className="font-heading text-5xl leading-tight text-[var(--color-pine)] sm:text-6xl">
            Sign in without leaving the trail map behind.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--color-forest-muted)]">
            Save rides, track organizer approval, and manage your local cycling profile in the
            same design system as the rest of Cycle Sonoma County.
          </p>
        </div>
        <div className="surface-card space-y-6 p-8 sm:p-10">
          <SectionHeading
            eyebrow="Welcome back"
            title="Sign in"
            description="Use your email and password to access your account, favorites, and organizer tools."
          />
          <SignInForm defaultEmail={email || ""} returnTo={returnTo || "/account"} />
        </div>
      </section>
    </PageShell>
  );
}
