"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  confirmSignUpAction,
  resendConfirmationCodeAction,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConfirmSignupForm({
  defaultEmail = "",
  returnTo = "/account",
}: {
  defaultEmail?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isResending, startResending] = useTransition();

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await confirmSignUpAction({ email, code });

          if (!result.ok) {
            toast.error(result.message || "Unable to confirm account.");
            return;
          }

          toast.success("Account confirmed. You can sign in now.");
          router.push(
            `/auth/signin?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}`,
          );
        });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="confirm-email">Email</Label>
        <Input
          id="confirm-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 rounded-2xl"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm-code">Confirmation code</Label>
        <Input
          id="confirm-code"
          inputMode="numeric"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="h-12 rounded-2xl"
        />
      </div>
      <Button type="submit" disabled={isPending} className="h-12 rounded-2xl">
        {isPending ? "Confirming..." : "Confirm account"}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={isResending}
        className="h-12 rounded-2xl"
        onClick={() =>
          startResending(async () => {
            const result = await resendConfirmationCodeAction(email);
            if (!result.ok) {
              toast.error(result.message || "Unable to resend code.");
              return;
            }
            toast.success(result.message);
          })
        }
      >
        {isResending ? "Sending..." : "Resend code"}
      </Button>
      <p className="text-sm leading-6 text-[var(--color-forest-muted)]">
        Already confirmed?{" "}
        <Link
          href={`/auth/signin?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}`}
          className="font-medium text-[var(--color-pine)]"
        >
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}
