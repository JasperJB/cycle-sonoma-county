import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";

const SESSION_COOKIE = "cycle_sc_session";

export type SessionUser = {
  userId: string;
  email: string;
  displayName?: string | null;
  role: "MEMBER" | "ORGANIZER" | "ADMIN";
};

function getSecret() {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function setSession(user: SessionUser) {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const result = await jwtVerify<SessionUser>(token, getSecret());
    return result.payload;
  } catch {
    return null;
  }
}

export async function requireSession(returnTo = "/account") {
  const session = await getSession();

  if (!session) {
    redirect(`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return session;
}
