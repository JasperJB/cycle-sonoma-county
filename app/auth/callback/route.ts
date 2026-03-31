import { NextResponse } from "next/server";
import { exchangeCodeForUser } from "@/lib/auth/cognito";
import { sessionFromUser, syncUserFromIdentity } from "@/lib/auth/user";
import { setSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/auth/signin", url));
  }

  const { claims, returnTo, tokens } = await exchangeCodeForUser(code, state);
  const user = await syncUserFromIdentity({
    email: claims.email || `${claims.sub}@cyclesonoma.invalid`,
    firstName:
      typeof claims.given_name === "string" ? claims.given_name : undefined,
    lastName:
      typeof claims.family_name === "string" ? claims.family_name : undefined,
    displayName: claims.name || claims.email,
    cognitoSub: claims.sub,
    groups: claims["cognito:groups"],
  });

  await setSession(
    sessionFromUser({
      ...user,
      cognitoAccessToken: tokens.accessToken,
      cognitoIdToken: tokens.idToken,
      cognitoRefreshToken: tokens.refreshToken,
      cognitoAccessTokenExpiresAt: tokens.expiresAt,
    }),
  );

  return NextResponse.redirect(new URL(returnTo, url));
}
