"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { signUpAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignUpForm({
  defaultEmail = "",
  inviteToken,
  inviteDetails,
}: {
  defaultEmail?: string;
  inviteToken?: string;
  inviteDetails?: {
    inviterName: string;
    organizationNames: string[];
  } | null;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await signUpAction({
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            inviteToken,
          });

          if (!result.ok) {
            toast.error(result.message || "Unable to create account.");
            return;
          }

          toast.success("Check your email for the confirmation code.");
          const confirmUrl = new URL("/auth/confirm", window.location.origin);
          confirmUrl.searchParams.set("email", result.email || email);
          if (inviteToken) {
            confirmUrl.searchParams.set("returnTo", "/organizer");
          }
          router.push(`${confirmUrl.pathname}${confirmUrl.search}`);
        });
      }}
    >
      {inviteDetails ? (
        <div className="rounded-2xl border border-[color:var(--color-border-soft)] bg-white/70 px-4 py-3 text-sm leading-6 text-[var(--color-forest-muted)]">
          <p className="font-medium text-[var(--color-pine)]">
            {inviteDetails.inviterName} shared organizer access with you.
          </p>
          <p>
            This account will be connected to {inviteDetails.organizationNames.join(", ")} after
            you confirm your email and sign in.
          </p>
        </div>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="signup-first-name">First name</Label>
          <Input
            id="signup-first-name"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="h-12 rounded-2xl"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="signup-last-name">Last name</Label>
          <Input
            id="signup-last-name"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="h-12 rounded-2xl"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 rounded-2xl"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 rounded-2xl"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="signup-confirm-password">Confirm password</Label>
          <Input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="h-12 rounded-2xl"
          />
        </div>
      </div>
      <p className="rounded-2xl border border-[color:var(--color-border-soft)] bg-white/65 px-4 py-3 text-sm leading-6 text-[var(--color-forest-muted)]">
        Passwords must be at least 8 characters and include uppercase, lowercase, number, and
        symbol characters.
      </p>
      <Button type="submit" disabled={isPending} className="h-12 rounded-2xl">
        {isPending ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-sm leading-6 text-[var(--color-forest-muted)]">
        Already have an account?{" "}
        <Link
          href={
            inviteToken
              ? `/auth/signin?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent("/organizer")}`
              : "/auth/signin"
          }
          className="font-medium text-[var(--color-pine)]"
        >
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}
