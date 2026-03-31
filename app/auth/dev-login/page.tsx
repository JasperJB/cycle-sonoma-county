import Link from "next/link";
import { DevLoginForm } from "@/components/forms/dev-login-form";
import { PageShell, SectionHeading } from "@/components/page-shell";
import { authMode } from "@/lib/env";

export default function DevLoginPage() {
  return (
    <PageShell className="items-center justify-center">
      <div className="surface-card max-w-xl space-y-6 p-8">
        <SectionHeading
          eyebrow={authMode === "development" ? "Development auth" : "Sign in"}
          title="Choose a demo account"
          description="Local development uses seeded member, organizer, and admin users when Cognito is not configured."
        />
        <DevLoginForm />
        <p className="text-sm leading-6 text-[var(--color-forest-muted)]">
          When Cognito environment variables are configured, the regular sign-in and signup
          routes redirect to Cognito managed login automatically.
        </p>
        <Link href="/" className="text-sm font-medium text-[var(--color-pine)]">
          Return home
        </Link>
      </div>
    </PageShell>
  );
}
