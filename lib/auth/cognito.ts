import { cookies } from "next/headers";
import {
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  GetUserCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
  UpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "node:crypto";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { env } from "@/lib/env";

const AUTH_FLOW_COOKIE = "cycle_sc_oauth";

type CognitoMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
};

const cognitoClient = new CognitoIdentityProviderClient({
  region: env.COGNITO_REGION,
});

function requirePasswordClientConfig() {
  if (!env.COGNITO_CLIENT_ID) {
    throw new Error("Sign-in is not configured on this deployment. Missing Cognito client ID.");
  }

  // This repository's Cognito bootstrap creates a secret-enabled app client.
  if (!env.COGNITO_CLIENT_SECRET) {
    throw new Error(
      "Sign-in is misconfigured on this deployment. Missing Cognito client secret.",
    );
  }
}

function base64Url(input: Uint8Array | Buffer) {
  return Buffer.from(input).toString("base64url");
}

async function sha256(input: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
}

function getSecretHash(email: string) {
  if (!env.COGNITO_CLIENT_SECRET) {
    return undefined;
  }

  return createHmac("sha256", env.COGNITO_CLIENT_SECRET)
    .update(`${email}${env.COGNITO_CLIENT_ID}`)
    .digest("base64");
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
    refresh_token?: string;
    expires_in?: number;
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
    tokens: {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    },
    claims: verified.payload as typeof verified.payload & {
      email?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      "cognito:groups"?: string[];
      sub: string;
    },
  };
}

function mapUserAttributes(attributes: Array<{ Name?: string; Value?: string }> = []) {
  const valueByName = new Map(attributes.map((item) => [item.Name, item.Value]));
  const firstName = valueByName.get("given_name") || undefined;
  const lastName = valueByName.get("family_name") || undefined;
  const name =
    valueByName.get("name") ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    undefined;

  return {
    email: valueByName.get("email") || "",
    firstName,
    lastName,
    displayName: name,
  };
}

export async function signUpWithPassword(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  requirePasswordClientConfig();
  const secretHash = getSecretHash(input.email);

  await cognitoClient.send(
    new SignUpCommand({
      ClientId: env.COGNITO_CLIENT_ID,
      SecretHash: secretHash,
      Username: input.email,
      Password: input.password,
      UserAttributes: [
        { Name: "email", Value: input.email },
        { Name: "name", Value: `${input.firstName} ${input.lastName}`.trim() },
        { Name: "given_name", Value: input.firstName },
        { Name: "family_name", Value: input.lastName },
      ],
    }),
  );
}

export async function confirmSignUp(email: string, code: string) {
  requirePasswordClientConfig();
  await cognitoClient.send(
    new ConfirmSignUpCommand({
      ClientId: env.COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
      SecretHash: getSecretHash(email),
    }),
  );
}

export async function resendConfirmationCode(email: string) {
  requirePasswordClientConfig();
  await cognitoClient.send(
    new ResendConfirmationCodeCommand({
      ClientId: env.COGNITO_CLIENT_ID,
      Username: email,
      SecretHash: getSecretHash(email),
    }),
  );
}

export async function signInWithPassword(email: string, password: string) {
  requirePasswordClientConfig();
  const response = await cognitoClient.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        ...(getSecretHash(email) ? { SECRET_HASH: getSecretHash(email)! } : {}),
      },
    }),
  );

  if (!response.AuthenticationResult?.AccessToken) {
    throw new Error("Cognito sign-in did not return tokens.");
  }

  const idToken = response.AuthenticationResult.IdToken!;
  const accessToken = response.AuthenticationResult.AccessToken;
  const refreshToken = response.AuthenticationResult.RefreshToken;
  const expiresIn = response.AuthenticationResult.ExpiresIn ?? 3600;
  const claims = decodeJwt(idToken);
  const user = await getCognitoUser(accessToken);

  return {
    claims: {
      sub: String(claims.sub),
      email: user.email || email,
      name: user.displayName,
      given_name: user.firstName,
      family_name: user.lastName,
      "cognito:groups": Array.isArray(claims["cognito:groups"])
        ? claims["cognito:groups"].map(String)
        : undefined,
    },
    tokens: {
      accessToken,
      idToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
    },
  };
}

export async function refreshCognitoTokens(email: string, refreshToken: string) {
  requirePasswordClientConfig();
  const response = await cognitoClient.send(
    new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: env.COGNITO_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
        ...(getSecretHash(email) ? { SECRET_HASH: getSecretHash(email)! } : {}),
      },
    }),
  );

  if (!response.AuthenticationResult?.AccessToken || !response.AuthenticationResult?.IdToken) {
    throw new Error("Unable to refresh Cognito session.");
  }

  return {
    accessToken: response.AuthenticationResult.AccessToken,
    idToken: response.AuthenticationResult.IdToken,
    refreshToken,
    expiresAt: Date.now() + (response.AuthenticationResult.ExpiresIn ?? 3600) * 1000,
  };
}

export async function getCognitoUser(accessToken: string) {
  const response = await cognitoClient.send(
    new GetUserCommand({
      AccessToken: accessToken,
    }),
  );

  return mapUserAttributes(response.UserAttributes);
}

export async function updateCognitoProfile(input: {
  accessToken: string;
  firstName: string;
  lastName: string;
}) {
  await cognitoClient.send(
    new UpdateUserAttributesCommand({
      AccessToken: input.accessToken,
      UserAttributes: [
        { Name: "given_name", Value: input.firstName },
        { Name: "family_name", Value: input.lastName },
        { Name: "name", Value: `${input.firstName} ${input.lastName}`.trim() },
      ],
    }),
  );
}

export async function changeCognitoPassword(input: {
  accessToken: string;
  currentPassword: string;
  newPassword: string;
}) {
  await cognitoClient.send(
    new ChangePasswordCommand({
      AccessToken: input.accessToken,
      PreviousPassword: input.currentPassword,
      ProposedPassword: input.newPassword,
    }),
  );
}
