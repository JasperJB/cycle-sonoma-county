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

  const { claims, returnTo } = await exchangeCodeForUser(code, state);
  const user = await syncUserFromIdentity({
    email: claims.email || `${claims.sub}@cyclesonoma.invalid`,
    displayName: claims.name || claims.email,
    cognitoSub: claims.sub,
    groups: claims["cognito:groups"],
  });

  await setSession(sessionFromUser(user));

  return NextResponse.redirect(new URL(returnTo, url));
}
