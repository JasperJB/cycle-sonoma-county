"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { subscribeNewsletterAction } from "@/app/actions/engagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { newsletterSchema } from "@/lib/validators";
import type { z } from "zod";

type NewsletterValues = z.infer<typeof newsletterSchema>;

export function NewsletterForm({ source = "site" }: { source?: string }) {
  const form = useForm<NewsletterValues>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      email: "",
    },
  });
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await subscribeNewsletterAction({ ...values, source });

          if (!result.ok) {
            toast.error(result.message || "Unable to subscribe.");
            return;
          }

          form.reset();
          toast.success(result.message);
        }),
      )}
      className="flex flex-col gap-3 sm:flex-row"
    >
      <div className="flex-1">
        <Input
          type="email"
          placeholder="Email for the weekly Sonoma digest"
          {...form.register("email")}
          className="h-12 rounded-2xl border-[color:var(--color-border-soft)] bg-white/90"
        />
        {form.formState.errors.email ? (
          <p className="mt-2 text-xs text-red-600">{form.formState.errors.email.message}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={isPending} className="h-12 rounded-2xl px-6">
        Subscribe
      </Button>
    </form>
  );
}
