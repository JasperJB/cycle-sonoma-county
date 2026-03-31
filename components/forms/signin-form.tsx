"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { signInAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm({
  defaultEmail = "",
  returnTo = "/account",
}: {
  defaultEmail?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await signInAction({ email, password, returnTo });

          if (!result.ok) {
            toast.error(result.message || "Unable to sign in.");
            if (result.needsConfirmation) {
              router.push(`/auth/confirm?email=${encodeURIComponent(email)}`);
            }
            return;
          }

          toast.success("Signed in.");
          router.push(result.redirectTo || "/account");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 rounded-2xl"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-12 rounded-2xl"
        />
      </div>
      <Button type="submit" disabled={isPending} className="h-12 rounded-2xl">
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-sm leading-6 text-[var(--color-forest-muted)]">
        Need an account?{" "}
        <Link href="/auth/signup" className="font-medium text-[var(--color-pine)]">
          Create one here
        </Link>
        .
      </p>
    </form>
  );
}
