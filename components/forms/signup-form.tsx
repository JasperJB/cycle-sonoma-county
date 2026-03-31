"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { signUpAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignUpForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
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
          });

          if (!result.ok) {
            toast.error(result.message || "Unable to create account.");
            return;
          }

          toast.success("Check your email for the confirmation code.");
          router.push(`/auth/confirm?email=${encodeURIComponent(result.email || email)}`);
        });
      }}
    >
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
        Passwords must be at least 8 characters and include uppercase, lowercase,
        number, and symbol characters.
      </p>
      <Button type="submit" disabled={isPending} className="h-12 rounded-2xl">
        {isPending ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-sm leading-6 text-[var(--color-forest-muted)]">
        Already have an account?{" "}
        <Link href="/auth/signin" className="font-medium text-[var(--color-pine)]">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}
