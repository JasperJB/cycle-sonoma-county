"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateAccountProfileAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountProfileForm({
  firstName,
  lastName,
  email,
}: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}) {
  const router = useRouter();
  const [nextFirstName, setNextFirstName] = useState(firstName || "");
  const [nextLastName, setNextLastName] = useState(lastName || "");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await updateAccountProfileAction({
            firstName: nextFirstName,
            lastName: nextLastName,
          });

          if (!result.ok) {
            toast.error(result.message || "Unable to update your profile.");
            return;
          }

          toast.success(result.message);
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="account-first-name">First name</Label>
          <Input
            id="account-first-name"
            autoComplete="given-name"
            value={nextFirstName}
            onChange={(event) => setNextFirstName(event.target.value)}
            className="h-12 rounded-2xl"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="account-last-name">Last name</Label>
          <Input
            id="account-last-name"
            autoComplete="family-name"
            value={nextLastName}
            onChange={(event) => setNextLastName(event.target.value)}
            className="h-12 rounded-2xl"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="account-email">Email</Label>
        <Input
          id="account-email"
          type="email"
          value={email}
          disabled
          className="h-12 rounded-2xl opacity-80"
        />
      </div>
      <Button type="submit" disabled={isPending} className="h-12 rounded-2xl">
        {isPending ? "Saving..." : "Save name"}
      </Button>
    </form>
  );
}
