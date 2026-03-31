"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { submitReportAction } from "@/app/actions/engagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { reportSchema } from "@/lib/validators";
import type { z } from "zod";

type ReportValues = z.infer<typeof reportSchema>;

export function ReportForm({
  targetId,
  targetType,
}: {
  targetId: string;
  targetType: "SHOP" | "CLUB" | "RIDE" | "EVENT" | "ROUTE";
}) {
  const form = useForm<ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      targetId,
      targetType,
      reason: "INCORRECT_INFO",
      description: "",
      reporterEmail: "",
    },
  });
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await submitReportAction(values);

          if (!result.ok) {
            toast.error(result.message || "Unable to submit report.");
            return;
          }

          toast.success(result.message);
          form.reset({ ...values, description: "", reporterEmail: "" });
        }),
      )}
    >
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--color-pine)]">Issue type</label>
        <select
          {...form.register("reason")}
          className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
        >
          <option value="INCORRECT_INFO">Incorrect info</option>
          <option value="CANCELED_RIDE">Canceled ride</option>
          <option value="INACTIVE_CLUB">Inactive club</option>
          <option value="DUPLICATE_LISTING">Duplicate listing</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--color-pine)]">What should be fixed?</label>
        <Textarea
          {...form.register("description")}
          rows={4}
          className="rounded-2xl bg-white/85"
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--color-pine)]">Email if you want a follow-up</label>
        <Input {...form.register("reporterEmail")} className="rounded-2xl bg-white/85" />
      </div>
      <Button type="submit" disabled={isPending} className="w-fit rounded-2xl px-6">
        Submit report
      </Button>
    </form>
  );
}
