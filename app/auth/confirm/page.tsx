import { ConfirmSignupForm } from "@/components/forms/confirm-signup-form";
import { PageShell, SectionHeading } from "@/components/page-shell";

export default async function ConfirmPage({
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
            Confirm your email
          </p>
          <h1 className="font-heading text-4xl leading-tight text-[var(--color-pine)] sm:text-5xl lg:text-6xl">
            One last code and your account is ready.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--color-forest-muted)]">
            Cognito sends a verification code to your email before the account can sign in.
          </p>
        </div>
        <div className="surface-card space-y-6 p-8 sm:p-10">
          <SectionHeading
            eyebrow="Verification"
            title="Confirm sign up"
            description="Enter the code from your email to activate the account."
          />
          <ConfirmSignupForm defaultEmail={email || ""} returnTo={returnTo || "/account"} />
        </div>
      </section>
    </PageShell>
  );
}
