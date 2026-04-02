"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  createRouteGuideAction,
  updateRouteGuideAction,
} from "@/app/actions/organizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { routeGuideSchema, type RouteGuideInput } from "@/lib/validators";

function buildDefaultValues(
  organizations: Array<{ id: string; name: string; type: string }>,
  initialValues?: Partial<RouteGuideInput>,
): RouteGuideInput {
  return {
    organizationId: initialValues?.organizationId || organizations[0]?.id || "",
    title: initialValues?.title || "",
    summary: initialValues?.summary || "",
    description: initialValues?.description || "",
    city: initialValues?.city || "",
    distanceMiles: initialValues?.distanceMiles || 25,
    elevationFeet: initialValues?.elevationFeet || 1000,
    surface: initialValues?.surface || "PAVED",
    bestSeason: initialValues?.bestSeason || "",
    startLocationName: initialValues?.startLocationName || "",
    startAddress: initialValues?.startAddress || "",
    routeUrl: initialValues?.routeUrl || "",
    touristFriendly: initialValues?.touristFriendly ?? true,
    beginnerFriendly: initialValues?.beginnerFriendly || false,
  };
}

export function RouteGuideForm({
  organizations,
  routeGuideId,
  initialValues,
  submitLabel = "Create route draft",
  redirectTo,
}: {
  organizations: Array<{ id: string; name: string; type: string }>;
  routeGuideId?: string;
  initialValues?: Partial<RouteGuideInput>;
  submitLabel?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const defaultValues = buildDefaultValues(organizations, initialValues);
  const form = useForm({
    resolver: zodResolver(routeGuideSchema),
    defaultValues,
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = routeGuideId
            ? await updateRouteGuideAction(routeGuideId, values as RouteGuideInput)
            : await createRouteGuideAction(values as RouteGuideInput);

          if (!result.ok) {
            toast.error(result.message || "Unable to save route.");
            return;
          }

          toast.success(result.message);

          if (redirectTo) {
            router.push(redirectTo);
            return;
          }

          if (!routeGuideId) {
            form.reset(buildDefaultValues(organizations));
          }

          router.refresh();
        }),
      )}
    >
      <select
        {...form.register("organizationId")}
        className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
      >
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>
      <Input {...form.register("title")} placeholder="Route title" className="rounded-2xl bg-white/85" />
      <Textarea
        {...form.register("summary")}
        placeholder="Short summary"
        rows={3}
        className="rounded-2xl bg-white/85"
      />
      <Textarea
        {...form.register("description")}
        placeholder="Description and cautions"
        rows={5}
        className="rounded-2xl bg-white/85"
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input {...form.register("city")} placeholder="City" className="rounded-2xl bg-white/85" />
        <Input
          type="number"
          {...form.register("distanceMiles")}
          placeholder="Miles"
          className="rounded-2xl bg-white/85"
        />
        <Input
          type="number"
          {...form.register("elevationFeet")}
          placeholder="Elevation feet"
          className="rounded-2xl bg-white/85"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <select
          {...form.register("surface")}
          className="h-11 rounded-2xl border border-[color:var(--color-border-soft)] bg-white/85 px-4 text-sm"
        >
          {["PAVED", "MIXED", "GRAVEL", "TRAIL"].map((surface) => (
            <option key={surface} value={surface}>
              {surface}
            </option>
          ))}
        </select>
        <Input {...form.register("bestSeason")} placeholder="Best season" className="rounded-2xl bg-white/85" />
      </div>
      <Input
        {...form.register("startLocationName")}
        placeholder="Start location name"
        className="rounded-2xl bg-white/85"
      />
      <Input
        {...form.register("startAddress")}
        placeholder="123 Example St"
        className="rounded-2xl bg-white/85"
      />
      <p className="text-xs text-[var(--color-forest-muted)]">
        Route start addresses are geocoded when you save so the map pin matches the actual start.
      </p>
      <Input
        {...form.register("routeUrl")}
        placeholder="GPX / RWGPS / Strava URL"
        className="rounded-2xl bg-white/85"
      />
      <div className="flex gap-6 text-sm text-[var(--color-pine)]">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register("touristFriendly")} />
          Tourist-friendly
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register("beginnerFriendly")} />
          Beginner-friendly
        </label>
      </div>
      <Button type="submit" disabled={isPending} className="w-fit rounded-2xl px-6">
        {submitLabel}
      </Button>
    </form>
  );
}
