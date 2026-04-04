"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { SessionUser } from "@/lib/auth/session";
import { publicPrimaryNav, publicSecondaryNav, type PublicNavItem } from "@/lib/site";
import { cn } from "@/lib/utils";

type PublicLinkNavItem = Extract<PublicNavItem, { kind: "link" }>;
type PublicGroupNavItem = Extract<PublicNavItem, { kind: "group" }>;

function matchesPath(pathname: string, matchPath: string) {
  return pathname === matchPath || pathname.startsWith(`${matchPath}/`);
}

function isNavItemActive(pathname: string, item: PublicNavItem) {
  return item.matchPaths.some((matchPath) => matchesPath(pathname, matchPath));
}

function isLinkNavItem(item: PublicNavItem): item is PublicLinkNavItem {
  return item.kind === "link";
}

function isGroupNavItem(item: PublicNavItem): item is PublicGroupNavItem {
  return item.kind === "group";
}

function desktopNavClass(isActive: boolean) {
  return cn(
    "inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-white/85 text-[var(--color-pine)] shadow-[0_16px_30px_-24px_rgba(24,58,45,0.65)]"
      : "text-[var(--color-forest-muted)] hover:bg-white/65 hover:text-[var(--color-pine)]",
  );
}

function mobileNavLinkClass(isActive: boolean) {
  return cn(
    "rounded-2xl border px-4 py-3 text-sm font-medium transition",
    isActive
      ? "border-[var(--color-clay)]/40 bg-white text-[var(--color-pine)]"
      : "border-transparent bg-white/65 text-[var(--color-forest-muted)] hover:border-[color:var(--color-border-soft)] hover:text-[var(--color-pine)]",
  );
}

export function SiteHeaderClient({ session }: { session: SessionUser | null }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-[color:var(--color-paper)]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:gap-6 lg:px-8">
        <Logo className="min-w-0 flex-1 lg:flex-none" />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {publicPrimaryNav.map((item) => {
            const isActive = isNavItemActive(pathname, item);

            if (item.kind === "link") {
              return (
                <Link key={item.href} href={item.href} className={desktopNavClass(isActive)}>
                  {item.label}
                </Link>
              );
            }

            return (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger
                  className={desktopNavClass(isActive)}
                  openOnHover
                  delay={60}
                  closeDelay={80}
                >
                  {item.label}
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-64 rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-paper-strong)] p-2 shadow-[0_22px_70px_-40px_rgba(24,58,45,0.55)]"
                  sideOffset={10}
                >
                  {item.items.map((link) => (
                    <DropdownMenuLinkItem
                      key={link.href}
                      closeOnClick
                      render={<Link href={link.href} />}
                      className="rounded-xl px-3 py-2 text-[var(--color-pine)] hover:bg-white/80"
                    >
                      {link.label}
                    </DropdownMenuLinkItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {session ? (
            <>
              <Button asChild variant="ghost">
                <Link href="/account">Account</Link>
              </Button>
              {session.role !== "MEMBER" ? (
                <Button asChild variant="ghost">
                  <Link href={session.role === "ADMIN" ? "/admin" : "/organizer"}>
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
                <Link href="/newsletter">Newsletter</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signin">Sign in</Link>
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
                  Find rides, race events, route ideas, rentals, and trusted local bike services.
                </SheetDescription>
              </SheetHeader>
              <div className="flex h-full flex-col overflow-y-auto px-5 py-5">
                <div className="grid gap-3">
                  {publicPrimaryNav
                    .filter(isLinkNavItem)
                    .map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={mobileNavLinkClass(isNavItemActive(pathname, item))}
                      >
                        {item.label}
                      </Link>
                    ))}
                </div>

                <Accordion className="mt-4 gap-2" multiple>
                  {publicPrimaryNav
                    .filter(isGroupNavItem)
                    .map((item) => (
                      <AccordionItem
                        key={item.label}
                        value={item.label}
                        className="overflow-hidden rounded-[1.35rem] border border-[color:var(--color-border-soft)] bg-white/65 px-4"
                      >
                        <AccordionTrigger className="py-4 text-[var(--color-pine)] no-underline hover:no-underline">
                          <span className="text-base">{item.label}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="grid gap-2">
                            {item.items.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className="rounded-xl px-3 py-2 text-sm text-[var(--color-forest-muted)] transition hover:bg-white hover:text-[var(--color-pine)]"
                              >
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>

                <div className="mt-6 space-y-3 border-t border-[color:var(--color-border-soft)] pt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest-soft)]">
                    More
                  </p>
                  <div className="grid gap-2">
                    {publicSecondaryNav.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="rounded-xl px-3 py-2 text-sm text-[var(--color-forest-muted)] transition hover:bg-white hover:text-[var(--color-pine)]"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>

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
                    <Button asChild className="w-full justify-center">
                      <Link href="/auth/signin" onClick={() => setIsOpen(false)}>
                        Sign in
                      </Link>
                    </Button>
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
