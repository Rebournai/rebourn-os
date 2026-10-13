import { PB_AUTH_URL, PB_COLLECTION } from "../config.js";

export interface PbSession {
  pbToken: string;
  pbTokenExp: number;
  email: string;
  recordId: string;
}

function decodeJwtExp(token: string): number {
  const parts = token.split(".");
  if (parts.length < 2) return 0;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp : 0;
  } catch {
    return 0;
  }
}

export async function authWithPassword(params: {
  identity: string;
  password: string;
}): Promise<PbSession> {
  const url = `${PB_AUTH_URL}/api/collections/${PB_COLLECTION}/auth-with-password`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: params.identity,
      password: params.password,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 400) {
      // PocketBase answers 400 both for bad credentials and for "password
      // auth is disabled on this collection". Surface the latter, since the
      // user can't fix it by retyping their password.
      let message = "";
      try { message = String((JSON.parse(text) as { message?: string }).message || ""); } catch { /* not JSON */ }
      if (/not configured|disabled/i.test(message)) {
        throw new Error("Relay.md does not allow password sign-in for this account. Use one of the provider buttons instead.");
      }
      throw new Error("invalid email or password");
    }
    throw new Error(`PB auth-with-password failed (${res.status}): ${text}`);
  }
  const body = await res.json() as { token: string; record: { id: string; email: string } };
  return {
    pbToken: body.token,
    pbTokenExp: decodeJwtExp(body.token),
    email: String(body.record.email || "").toLowerCase(),
    recordId: body.record.id,
  };
}

export interface PbOAuthProvider {
  name: string;
  displayName: string;
  authURL: string;
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
}

/**
 * Fetch the collection's configured sign-in methods, including OAuth2
 * providers (Google/GitHub/Microsoft/etc). PocketBase generates a fresh
 * PKCE codeVerifier/codeChallenge/state pair on every call, so this must
 * be called once per login attempt (not cached).
 */
export async function getAuthMethods(): Promise<{
  passwordEnabled: boolean;
  providers: PbOAuthProvider[];
}> {
  const url = `${PB_AUTH_URL}/api/collections/${PB_COLLECTION}/auth-methods`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PB auth-methods failed (${res.status}): ${await res.text()}`);
  }
  const body = await res.json() as {
    authProviders?: PbOAuthProvider[];
    password?: { enabled?: boolean };
    emailPassword?: boolean;
  };
  return {
    passwordEnabled: Boolean(body.password?.enabled ?? body.emailPassword),
    providers: body.authProviders || [],
  };
}

/**
 * Complete a PocketBase OAuth2 sign-in: exchange the provider's
 * authorization code (obtained via the provider's own consent screen,
 * redirected back through PocketBase's generic /api/oauth2-redirect page)
 * for a PocketBase auth token.
 */
export async function authWithOAuth2(params: {
  provider: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<PbSession> {
  const url = `${PB_AUTH_URL}/api/collections/${PB_COLLECTION}/auth-with-oauth2`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // PocketBase's field is `redirectURL` (older versions: `redirectUrl`).
    // Go's JSON decoder matches keys case-insensitively, so this one key
    // satisfies both.
    body: JSON.stringify({
      provider: params.provider,
      code: params.code,
      codeVerifier: params.codeVerifier,
      redirectURL: params.redirectUri,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PB auth-with-oauth2 failed (${res.status}): ${text}`);
  }
  const body = await res.json() as { token: string; record: { id: string; email: string } };
  return {
    pbToken: body.token,
    pbTokenExp: decodeJwtExp(body.token),
    email: String(body.record.email || "").toLowerCase(),
    recordId: body.record.id,
  };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const url = `${PB_AUTH_URL}/api/collections/${PB_COLLECTION}/request-password-reset`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`PB request-password-reset failed (${res.status}): ${await res.text()}`);
  }
}

export async function refreshPbToken(pbToken: string): Promise<PbSession> {
  const url = `${PB_AUTH_URL}/api/collections/${PB_COLLECTION}/auth-refresh`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: pbToken },
  });
  if (!res.ok) throw new Error(`PB auth-refresh failed (${res.status}): ${await res.text()}`);
  const body = await res.json() as { token: string; record: { id: string; email: string } };
  return {
    pbToken: body.token,
    pbTokenExp: decodeJwtExp(body.token),
    email: String(body.record.email || "").toLowerCase(),
    recordId: body.record.id,
  };
}
