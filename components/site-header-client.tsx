"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { SessionUser } from "@/lib/auth/session";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

function navLinkClass(isActive: boolean) {
  return cn(
    "transition hover:text-[var(--color-pine)]",
    isActive ? "text-[var(--color-pine)]" : "text-[var(--color-forest-muted)]",
  );
}

export function SiteHeaderClient({ session }: { session: SessionUser | null }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-[color:var(--color-paper)]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:gap-6 lg:px-8">
        <Logo className="min-w-0 flex-1 lg:flex-none" />
        <nav className="hidden items-center gap-5 text-sm lg:flex">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(pathname === item.href)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {session ? (
            <>
              <Button asChild variant="ghost">
                <Link href="/account" onClick={() => setIsOpen(false)}>
                  Account
                </Link>
              </Button>
              {session.role !== "MEMBER" ? (
                <Button asChild variant="ghost">
                  <Link
                    href={session.role === "ADMIN" ? "/admin" : "/organizer"}
                    onClick={() => setIsOpen(false)}
                  >
                    {session.role === "ADMIN" ? "Admin" : "Organizer"}
                  </Link>
                </Button>
              ) : null}
              <form action={logoutAction}>
                <Button type="submit" variant="outline">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/newsletter" onClick={() => setIsOpen(false)}>
                  Newsletter
                </Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signin" onClick={() => setIsOpen(false)}>
                  Sign in
                </Link>
              </Button>
            </>
          )}
        </div>
        <div className="lg:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-lg"
                  aria-label="Open navigation menu"
                />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[min(88vw,24rem)] border-[color:var(--color-border-soft)] bg-[color:var(--color-paper)] p-0"
            >
              <SheetHeader className="border-b border-[color:var(--color-border-soft)] px-5 py-5">
                <SheetTitle>Browse Cycle Sonoma County</SheetTitle>
                <SheetDescription>
                  Navigate the public site and account actions without losing the map.
                </SheetDescription>
              </SheetHeader>
              <div className="flex h-full flex-col overflow-y-auto px-5 py-5">
                <nav className="grid gap-2">
                  {siteConfig.nav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-sm font-medium transition",
                        pathname === item.href
                          ? "border-[var(--color-clay)]/40 bg-white text-[var(--color-pine)]"
                          : "border-transparent bg-white/65 text-[var(--color-forest-muted)] hover:border-[color:var(--color-border-soft)] hover:text-[var(--color-pine)]",
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-6 space-y-3 border-t border-[color:var(--color-border-soft)] pt-5">
                  {session ? (
                    <>
                      <Button asChild variant="ghost" className="w-full justify-start">
                        <Link href="/account" onClick={() => setIsOpen(false)}>
                          Account
                        </Link>
                      </Button>
                      {session.role !== "MEMBER" ? (
                        <Button asChild variant="ghost" className="w-full justify-start">
                          <Link
                            href={session.role === "ADMIN" ? "/admin" : "/organizer"}
                            onClick={() => setIsOpen(false)}
                          >
                            {session.role === "ADMIN" ? "Admin console" : "Organizer console"}
                          </Link>
                        </Button>
                      ) : null}
                      <form action={logoutAction} className="w-full">
                        <Button
                          type="submit"
                          variant="outline"
                          className="w-full justify-center"
                          onClick={() => setIsOpen(false)}
                        >
                          Sign out
                        </Button>
                      </form>
                    </>
                  ) : (
                    <>
                      <Button asChild variant="ghost" className="w-full justify-start">
                        <Link href="/newsletter" onClick={() => setIsOpen(false)}>
                          Newsletter
                        </Link>
                      </Button>
                      <Button asChild className="w-full justify-center">
                        <Link href="/auth/signin" onClick={() => setIsOpen(false)}>
                          Sign in
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
