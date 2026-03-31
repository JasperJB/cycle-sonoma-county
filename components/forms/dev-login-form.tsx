"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { devLoginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const demoUsers = [
  { email: "member@cyclesonoma.demo", label: "Member demo" },
  { email: "organizer@cyclesonoma.demo", label: "Organizer demo" },
  { email: "admin@cyclesonoma.demo", label: "Admin demo" },
];

export function DevLoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-3">
      {demoUsers.map((user) => (
        <Button
          key={user.email}
          type="button"
          disabled={isPending}
          variant="outline"
          className="justify-start rounded-2xl border-[color:var(--color-border-soft)] bg-white/80"
          onClick={() =>
            startTransition(async () => {
              const result = await devLoginAction(user.email);

              if (!result.ok) {
                toast.error(result.message || "Unable to sign in.");
                return;
              }

              toast.success(`Signed in as ${user.label}.`);
              router.push("/account");
              router.refresh();
            })
          }
        >
          {user.label}
        </Button>
      ))}
    </div>
  );
}
