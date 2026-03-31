import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refreshCognitoTokens } from "@/lib/auth/cognito";
import { env } from "@/lib/env";

const SESSION_COOKIE = "cycle_sc_session";

export type SessionUser = {
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  role: "MEMBER" | "ORGANIZER" | "ADMIN";
  cognitoAccessToken?: string | null;
  cognitoIdToken?: string | null;
  cognitoRefreshToken?: string | null;
  cognitoAccessTokenExpiresAt?: number | null;
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

export async function getSessionWithCognitoRefresh() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  if (
    session.cognitoRefreshToken &&
    session.cognitoAccessTokenExpiresAt &&
    session.cognitoAccessTokenExpiresAt <= Date.now() + 60_000
  ) {
    const refreshed = await refreshCognitoTokens(session.email, session.cognitoRefreshToken);
    const updatedSession = {
      ...session,
      cognitoAccessToken: refreshed.accessToken,
      cognitoIdToken: refreshed.idToken,
      cognitoRefreshToken: refreshed.refreshToken,
      cognitoAccessTokenExpiresAt: refreshed.expiresAt,
    };
    await setSession(updatedSession);
    return updatedSession;
  }

  return session;
}

export async function requireSession(returnTo = "/account") {
  const session = await getSessionWithCognitoRefresh();

  if (!session) {
    redirect(`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return session;
}
