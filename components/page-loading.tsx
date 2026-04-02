import { PageShell } from "@/components/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export function ExplorePageLoading() {
  return (
    <PageShell className="gap-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full max-w-2xl" />
        <Skeleton className="h-6 w-full max-w-3xl" />
      </div>
      <div className="surface-card grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-6">
        <Skeleton className="h-12 sm:col-span-2 lg:col-span-2" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12 sm:col-span-2 lg:col-span-1" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-card hidden max-h-[75vh] overflow-auto p-3 lg:block">
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-[1.25rem]" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-14 rounded-[1.4rem] lg:hidden" />
          <div className="surface-card h-[min(62svh,34rem)] overflow-hidden p-3 sm:h-[30rem] lg:h-[75vh]">
            <Skeleton className="h-full rounded-[1.25rem]" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export function ListingDetailLoading() {
  return (
    <PageShell className="gap-8">
      <section className="hero-glow surface-card space-y-5 px-5 py-6 sm:px-8 sm:py-8">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-12 w-full max-w-3xl sm:h-16" />
        <Skeleton className="h-24 w-full max-w-4xl" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-9 w-full sm:w-32" />
          <Skeleton className="h-9 w-full sm:w-36" />
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="surface-card space-y-4 p-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16" />
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="surface-card space-y-4 p-6">
          <Skeleton className="h-10 w-52" />
          <Skeleton className="h-56 w-full" />
        </div>
      </section>
    </PageShell>
  );
}
