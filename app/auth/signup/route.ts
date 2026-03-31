import { NextResponse } from "next/server";
import { authMode } from "@/lib/env";
import { buildCognitoUrl } from "@/lib/auth/cognito";

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (authMode === "cognito") {
    return NextResponse.redirect(await buildCognitoUrl({ screen: "signup", returnTo: "/account" }));
  }

  return NextResponse.redirect(new URL("/auth/dev-login", url));
}
