import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { getSession } from "@/lib/auth/session";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/actions/auth";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-[color:var(--color-paper)]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-5 text-sm text-[var(--color-forest-muted)] lg:flex">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-[var(--color-pine)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/account">Account</Link>
              </Button>
              {session.role !== "MEMBER" ? (
                <Button asChild variant="ghost" className="hidden md:inline-flex">
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
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/newsletter">Newsletter</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signin">Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
