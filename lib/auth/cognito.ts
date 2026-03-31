import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "@/lib/env";

const AUTH_FLOW_COOKIE = "cycle_sc_oauth";

type CognitoMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
};

function base64Url(input: Uint8Array | Buffer) {
  return Buffer.from(input).toString("base64url");
}

async function sha256(input: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
}

export async function getCognitoMetadata(): Promise<CognitoMetadata> {
  if (!env.COGNITO_ISSUER) {
    throw new Error("Missing COGNITO_ISSUER");
  }

  const response = await fetch(
    `${env.COGNITO_ISSUER}/.well-known/openid-configuration`,
    { cache: "force-cache" },
  );

  if (!response.ok) {
    throw new Error("Unable to load Cognito discovery metadata");
  }

  return response.json();
}

export async function createAuthRequest(returnTo = "/") {
  const codeVerifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const codeChallenge = base64Url(new Uint8Array(await sha256(codeVerifier)));
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const cookieStore = await cookies();

  cookieStore.set(
    AUTH_FLOW_COOKIE,
    JSON.stringify({ codeVerifier, state, nonce, returnTo }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    },
  );

  return { codeChallenge, state, nonce };
}

export async function readAuthRequest() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(AUTH_FLOW_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as {
      codeVerifier: string;
      state: string;
      nonce: string;
      returnTo: string;
    };
  } catch {
    return null;
  }
}

export async function clearAuthRequest() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_FLOW_COOKIE);
}

export async function buildCognitoUrl(options?: {
  screen?: "signin" | "signup";
  returnTo?: string;
}) {
  const metadata = await getCognitoMetadata();
  const { codeChallenge, state, nonce } = await createAuthRequest(
    options?.returnTo,
  );
  const authorizationUrl = new URL(
    options?.screen === "signup" && env.COGNITO_DOMAIN
      ? `${env.COGNITO_DOMAIN}/signup`
      : metadata.authorization_endpoint,
  );

  authorizationUrl.searchParams.set("client_id", env.COGNITO_CLIENT_ID!);
  authorizationUrl.searchParams.set(
    "redirect_uri",
    env.COGNITO_REDIRECT_URI || `${env.APP_URL}/auth/callback`,
  );
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", env.COGNITO_SCOPES);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("nonce", nonce);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  return authorizationUrl.toString();
}

export async function exchangeCodeForUser(code: string, state: string) {
  const authRequest = await readAuthRequest();

  if (!authRequest || authRequest.state !== state) {
    throw new Error("Invalid OAuth state");
  }

  const metadata = await getCognitoMetadata();
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: env.COGNITO_CLIENT_ID!,
    redirect_uri: env.COGNITO_REDIRECT_URI || `${env.APP_URL}/auth/callback`,
    code_verifier: authRequest.codeVerifier,
  });

  const response = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(env.COGNITO_CLIENT_SECRET
        ? {
            authorization: `Basic ${Buffer.from(
              `${env.COGNITO_CLIENT_ID}:${env.COGNITO_CLIENT_SECRET}`,
            ).toString("base64")}`,
          }
        : {}),
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error("Token exchange failed");
  }

  const tokens = (await response.json()) as {
    id_token: string;
    access_token: string;
  };

  const jwks = createRemoteJWKSet(new URL(metadata.jwks_uri));
  const verified = await jwtVerify(tokens.id_token, jwks, {
    issuer: env.COGNITO_ISSUER,
    audience: env.COGNITO_CLIENT_ID,
  });

  if (verified.payload.nonce !== authRequest.nonce) {
    throw new Error("Invalid nonce");
  }

  await clearAuthRequest();

  return {
    returnTo: authRequest.returnTo || "/",
    claims: verified.payload as typeof verified.payload & {
      email?: string;
      name?: string;
      "cognito:groups"?: string[];
      sub: string;
    },
  };
}
