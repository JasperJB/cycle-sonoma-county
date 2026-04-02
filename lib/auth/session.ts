import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refreshCognitoTokens } from "@/lib/auth/cognito";
import { env } from "@/lib/env";

const SESSION_COOKIE = "cycle_sc_session";
const REFRESH_COOKIE = "cycle_sc_refresh";

export type SessionUser = {
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  role: "MEMBER" | "ORGANIZER" | "ADMIN";
};

type RefreshSession = {
  email: string;
  refreshToken: string;
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

async function createRefreshTokenToken(refresh: RefreshSession) {
  return new SignJWT(refresh)
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

export async function setRefreshSession(email: string, refreshToken?: string | null) {
  const cookieStore = await cookies();

  if (!refreshToken) {
    cookieStore.delete(REFRESH_COOKIE);
    return;
  }

  const token = await createRefreshTokenToken({ email, refreshToken });
  cookieStore.set(REFRESH_COOKIE, token, {
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
  cookieStore.delete(REFRESH_COOKIE);
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

async function getRefreshSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const result = await jwtVerify<RefreshSession>(token, getSecret());
    return result.payload;
  } catch {
    return null;
  }
}

export async function getCognitoAccessToken(email: string) {
  const refreshSession = await getRefreshSession();

  if (!refreshSession || refreshSession.email !== email) {
    return null;
  }

  return refreshCognitoTokens(email, refreshSession.refreshToken);
}

export async function getSessionWithCognitoRefresh() {
  return getSession();
}

export async function requireSession(returnTo = "/account") {
  const session = await getSessionWithCognitoRefresh();

  if (!session) {
    redirect(`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return session;
}
