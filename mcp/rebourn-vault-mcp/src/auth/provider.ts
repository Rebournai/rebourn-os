import type { Response } from "express";
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
  OAuthTokenRevocationRequest,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  InvalidGrantError,
  InvalidTokenError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";

import { ALLOWED_EMAILS, STATIC_MCP_BEARER, PB_AUTH_URL } from "../config.js";
import { PRODUCT_NAME, PRODUCT_VENDOR } from "../branding.js";
import { clientsStore } from "./clients.js";
import { createPending, consumePending, touchPending, attachOAuth2Flow, type PendingAuth } from "./pending.js";
import { createCode, consumeCode, peekCode } from "./codes.js";
import { createSession, getSession } from "./sessions.js";
import { authWithPassword, requestPasswordReset, getAuthMethods, authWithOAuth2 } from "./pocketbase.js";
import { openOAuth2Relay } from "./pb-realtime.js";
import {
  signAccessToken,
  verifyAccessJwt,
  issueRefreshToken,
  redeemRefreshToken,
  revokeRefreshToken,
  ACCESS_TOKEN_TTL_SEC,
} from "./tokens.js";

export const LOGIN_PATH = "/oauth/login";
export const RESET_PATH = "/oauth/reset-request";
export const OAUTH2_INIT_PATH = "/oauth/oauth2/init";
export const OAUTH2_STATUS_PATH = "/oauth/oauth2/status";

/**
 * PocketBase's built-in OAuth2 redirect endpoint. It is the redirect_uri
 * registered with each provider's OAuth app on Relay.md's side, so we never
 * need our own URL allow-listed with Google/GitHub/Microsoft. Server-side it
 * relays `{ state, code }` to the realtime client named by `state` (see
 * pb-realtime.ts), which is how the code reaches this server.
 */
const PB_OAUTH2_REDIRECT_URI = `${PB_AUTH_URL}/api/oauth2-redirect`;

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface Banner { type: "info" | "success" | "error"; text: string }

/** What the sign-in page offers, discovered from Relay.md at render time. */
export interface SignInOptions {
  providers: { name: string; displayName: string }[];
  passwordEnabled: boolean;
}

const FALLBACK_OPTIONS: SignInOptions = { providers: [], passwordEnabled: true };

async function discoverSignInOptions(): Promise<{ options: SignInOptions; banner?: Banner }> {
  try {
    const methods = await getAuthMethods();
    return {
      options: {
        providers: methods.providers.map(p => ({ name: p.name, displayName: p.displayName || p.name })),
        passwordEnabled: methods.passwordEnabled,
      },
    };
  } catch (err: any) {
    console.error("[sign-in] could not discover auth methods:", err?.message || err);
    return {
      options: FALLBACK_OPTIONS,
      banner: { type: "error", text: "Could not reach Relay.md to list sign-in methods. Try again in a moment." },
    };
  }
}

function renderLoginPage(params: {
  state: string;
  options: SignInOptions;
  error?: string;
  banner?: Banner;
  email?: string;
}): string {
  const err = params.error ? `<p class="err">${escapeHtml(params.error)}</p>` : "";
  const banner = params.banner
    ? `<p class="banner banner-${params.banner.type}">${escapeHtml(params.banner.text)}</p>`
    : "";
  const emailVal = params.email ? escapeHtml(params.email) : "";
  const { providers, passwordEnabled } = params.options;

  const providerButtons = providers
    .map(p => `<button type="button" class="oauth2-btn" data-provider="${escapeHtml(p.name)}">Continue with ${escapeHtml(p.displayName)}</button>`)
    .join("\n  ");

  const subtitle = providers.length && passwordEnabled
    ? "Sign in with your Relay.md account."
    : providers.length
      ? `Sign in with the account you use for Relay.md (${providers.map(p => p.displayName).join(", ")}).`
      : passwordEnabled
        ? "Use your Relay.md email and password."
        : "No sign-in methods are available right now.";

  const passwordSection = passwordEnabled ? `
  ${providers.length ? '<div class="divider"><span>or sign in with email</span></div>' : ""}
  <form method="POST" action="${LOGIN_PATH}">
    <input type="hidden" name="state" value="${escapeHtml(params.state)}">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" autocomplete="email" value="${emailVal}" required>
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Sign in</button>
  </form>
  <details>
    <summary>Forgot password or haven't set one yet?</summary>
    <p class="sub2">Enter your email and Relay.md will send a reset link. Come back to this page once you've set a password.</p>
    <form method="POST" action="${RESET_PATH}">
      <input type="hidden" name="state" value="${escapeHtml(params.state)}">
      <label for="reset_email">Email</label>
      <input id="reset_email" name="email" type="email" autocomplete="email" value="${emailVal}" required>
      <button type="submit" class="secondary">Send reset email</button>
    </form>
  </details>` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in to ${escapeHtml(PRODUCT_NAME)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
  .card { background: #1e293b; padding: 2rem 2.25rem; border-radius: 12px; width: 100%; max-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,.3); }
  h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
  p.sub { color: #94a3b8; margin: 0 0 1.5rem; font-size: .9rem; }
  label { display: block; font-size: .85rem; margin-bottom: .35rem; color: #cbd5e1; }
  input { width: 100%; box-sizing: border-box; padding: .625rem .75rem; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #f1f5f9; font-size: .95rem; margin-bottom: 1rem; }
  input:focus { outline: none; border-color: #38bdf8; }
  button { width: 100%; padding: .7rem; background: #38bdf8; color: #0f172a; border: 0; border-radius: 8px; font-weight: 600; font-size: .95rem; cursor: pointer; }
  button:hover { background: #7dd3fc; }
  button:disabled { opacity: .6; cursor: default; }
  button.secondary { background: transparent; color: #cbd5e1; border: 1px solid #334155; font-weight: 500; }
  button.secondary:hover { background: #0f172a; border-color: #38bdf8; color: #e0f2fe; }
  button.oauth2-btn { margin-bottom: .6rem; }
  .divider { display: flex; align-items: center; gap: .75rem; color: #64748b; font-size: .8rem; margin: .9rem 0 1.1rem; }
  .divider:before, .divider:after { content: ""; flex: 1; border-top: 1px solid #334155; }
  .err { background: #450a0a; border: 1px solid #7f1d1d; color: #fecaca; padding: .6rem .75rem; border-radius: 8px; font-size: .85rem; margin-bottom: 1rem; }
  .banner { padding: .6rem .75rem; border-radius: 8px; font-size: .85rem; margin-bottom: 1rem; }
  .banner-info { background: #0c4a6e; border: 1px solid #0369a1; color: #bae6fd; }
  .banner-success { background: #064e3b; border: 1px solid #059669; color: #bbf7d0; }
  .banner-error { background: #450a0a; border: 1px solid #7f1d1d; color: #fecaca; }
  .hint { color: #94a3b8; font-size: .8rem; margin: .25rem 0 1rem; line-height: 1.4; }
  .hint a { color: #7dd3fc; }
  .foot { color: #475569; font-size: .72rem; margin-top: 1.5rem; text-align: center; }
  details { margin-top: 1.25rem; border-top: 1px solid #334155; padding-top: 1.25rem; }
  summary { cursor: pointer; color: #94a3b8; font-size: .85rem; list-style: none; user-select: none; }
  summary:hover { color: #cbd5e1; }
  summary::-webkit-details-marker { display: none; }
  summary:before { content: "\\203A  "; display: inline-block; transition: transform .15s; }
  details[open] summary:before { transform: rotate(90deg); }
  details .sub2 { color: #64748b; font-size: .8rem; margin: .75rem 0 1rem; line-height: 1.4; }
</style>
</head>
<body>
<div class="card">
  <h1>Sign in to ${escapeHtml(PRODUCT_NAME)}</h1>
  <p class="sub">${escapeHtml(subtitle)}</p>
  ${banner}${err}
  ${providerButtons}
  <p id="oauth2-status" class="hint" style="display:none"></p>
  ${passwordSection}
  <p class="foot">${escapeHtml(PRODUCT_NAME)} by ${escapeHtml(PRODUCT_VENDOR)}. Your notes stay in your Relay.md vault; this service only relays requests on your behalf.</p>
</div>
<script>
(function () {
  var OUR_STATE = ${JSON.stringify(params.state)};
  var INIT_PATH = ${JSON.stringify(OAUTH2_INIT_PATH)};
  var STATUS_PATH = ${JSON.stringify(OAUTH2_STATUS_PATH)};
  var POLL_MS = 1000;
  var MAX_WAIT_MS = 10 * 60 * 1000;
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".oauth2-btn"));
  var statusEl = document.getElementById("oauth2-status");

  function setStatus(text) {
    statusEl.style.display = text ? "block" : "none";
    statusEl.textContent = text || "";
  }
  function setBusy(busy) { buttons.forEach(function (b) { b.disabled = busy; }); }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var provider = btn.getAttribute("data-provider");
      var label = btn.textContent.replace(/^Continue with /, "");
      setBusy(true);
      setStatus("Opening " + label + " sign-in…");

      // Open the popup synchronously inside the click so popup blockers allow
      // it; we point it at the provider once the server hands us the URL.
      // Provider pages set Cross-Origin-Opener-Policy, which cuts this window
      // off from the page afterwards. That's expected: the result reaches our
      // server directly, not this page.
      var popup = window.open("about:blank", "rebourn-vault-oauth2", "width=520,height=680");

      fetch(INIT_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: OUR_STATE, provider: provider }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.authUrl) throw new Error(data.error || "Could not start sign-in.");

          if (popup) {
            popup.location.href = data.authUrl;
            setStatus("Finish signing in with " + label + " in the popup window. This page will continue on its own…");
          } else {
            setStatus("Popup was blocked. Allow popups for this site and try again, or open the sign-in in a new tab: ");
            var a = document.createElement("a");
            a.href = data.authUrl; a.target = "_blank"; a.rel = "noopener"; a.textContent = "open " + label + " sign-in";
            statusEl.appendChild(a);
          }

          var started = Date.now();
          var poll = setInterval(function () {
            if (Date.now() - started > MAX_WAIT_MS) {
              clearInterval(poll);
              setBusy(false);
              setStatus("Timed out waiting for the sign-in. Try again.");
              return;
            }
            fetch(STATUS_PATH + "?state=" + encodeURIComponent(OUR_STATE), { cache: "no-store" })
              .then(function (r) { return r.json(); })
              .then(function (s) {
                if (s.pending) return;
                clearInterval(poll);
                if (s.redirectUrl) {
                  setStatus("Signed in. Redirecting…");
                  try { if (popup && !popup.closed) popup.close(); } catch (e) {}
                  window.location.href = s.redirectUrl;
                } else {
                  setBusy(false);
                  setStatus(s.error || "Sign-in failed. Refresh this page and try again.");
                }
              })
              .catch(function () { /* transient; keep polling */ });
          }, POLL_MS);
        })
        .catch(function (e) {
          try { if (popup) popup.close(); } catch (err) {}
          setBusy(false);
          setStatus(e.message || "Could not start sign-in.");
        });
    });
  });
})();
</script>
</body>
</html>`;
}

function renderErrorPage(title: string, body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.card{background:#1e293b;padding:2rem;border-radius:12px;max-width:420px}h1{margin:0 0 .75rem;color:#fca5a5}p{color:#cbd5e1}</style>
</head><body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p><p>You can close this tab.</p></div></body></html>`;
}

// ---------------------------------------------------------------------------
// OAuth 2.1 server provider (what the MCP SDK talks to)
// ---------------------------------------------------------------------------

export class RelayOAuthProvider implements OAuthServerProvider {
  get clientsStore(): OAuthRegisteredClientsStore {
    return clientsStore;
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    const pending = createPending({
      claudeClientId: client.client_id,
      claudeRedirectUri: params.redirectUri,
      claudeState: params.state,
      claudeCodeChallenge: params.codeChallenge,
      claudeResource: params.resource?.toString(),
    });

    const { options, banner } = await discoverSignInOptions();
    res.status(200).type("text/html").send(renderLoginPage({ state: pending.ourState, options, banner }));
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const code = peekCode(authorizationCode);
    if (!code) throw new InvalidGrantError("invalid or expired authorization code");
    return code.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    _resource?: URL
  ): Promise<OAuthTokens> {
    const code = consumeCode(authorizationCode);
    if (!code) throw new InvalidGrantError("invalid or expired authorization code");
    if (code.clientId !== client.client_id) {
      throw new InvalidGrantError("code was issued to a different client");
    }

    const session = getSession(code.sid);
    if (!session) throw new InvalidGrantError("session no longer exists");

    const accessToken = await signAccessToken({
      sid: session.sid,
      email: session.email,
      clientId: client.client_id,
    });
    const refreshToken = issueRefreshToken(session.sid, client.client_id);

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SEC,
      refresh_token: refreshToken,
    };
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    _scopes?: string[],
    _resource?: URL
  ): Promise<OAuthTokens> {
    const redeemed = redeemRefreshToken(refreshToken);
    if (!redeemed) throw new InvalidGrantError("invalid or expired refresh token");
    if (redeemed.clientId !== client.client_id) {
      throw new InvalidGrantError("refresh token was issued to a different client");
    }
    const session = getSession(redeemed.sid);
    if (!session) {
      revokeRefreshToken(refreshToken);
      throw new InvalidGrantError("session no longer exists");
    }

    const accessToken = await signAccessToken({
      sid: session.sid,
      email: session.email,
      clientId: client.client_id,
    });

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SEC,
      refresh_token: refreshToken,
    };
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    if (STATIC_MCP_BEARER && token === STATIC_MCP_BEARER) {
      return {
        token,
        clientId: "static-bearer",
        scopes: [],
        expiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
        extra: { mode: "static" },
      };
    }

    try {
      const verified = await verifyAccessJwt(token);
      const session = getSession(verified.sid);
      if (!session) throw new InvalidTokenError("session no longer exists");
      return {
        token,
        clientId: verified.clientId,
        scopes: [],
        expiresAt: verified.expSec,
        extra: {
          mode: "oauth",
          sid: verified.sid,
          email: verified.email,
        },
      };
    } catch (err: any) {
      if (err instanceof InvalidTokenError) throw err;
      throw new InvalidTokenError(err.message || "invalid access token");
    }
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest
  ): Promise<void> {
    const token = request.token;
    if (request.token_type_hint === "refresh_token" || !request.token_type_hint) {
      revokeRefreshToken(token);
    }
  }
}

// ---------------------------------------------------------------------------
// Shared: turn a PocketBase session into an authorization code for Claude
// ---------------------------------------------------------------------------

function finishSession(pending: PendingAuth, pb: {
  pbToken: string;
  pbTokenExp: number;
  email: string;
  recordId: string;
}): { redirectUrl: string } {
  const session = createSession({
    pbToken: pb.pbToken,
    pbTokenExp: pb.pbTokenExp,
    email: pb.email,
    recordId: pb.recordId,
  });

  const code = createCode({
    sid: session.sid,
    clientId: pending.claudeClientId,
    redirectUri: pending.claudeRedirectUri,
    codeChallenge: pending.claudeCodeChallenge,
    resource: pending.claudeResource,
  });

  const finalRedirect = new URL(pending.claudeRedirectUri);
  finalRedirect.searchParams.set("code", code.code);
  if (pending.claudeState) finalRedirect.searchParams.set("state", pending.claudeState);
  return { redirectUrl: finalRedirect.toString() };
}

function notAllowed(email: string): string {
  return `Your account (${email}) is not in the allow-list for this server.`;
}

// ---------------------------------------------------------------------------
// Email + password (only offered when Relay.md's backend has it enabled)
// ---------------------------------------------------------------------------

/**
 * Handle POST /oauth/login (form submission).
 */
export async function handleLogin(params: {
  state: string;
  email: string;
  password: string;
}): Promise<
  | { redirectUrl: string }
  | { pageHtml: string; status: number }
> {
  const pending = consumePending(params.state);
  if (!pending) {
    return { pageHtml: renderErrorPage("Session expired", "Your sign-in link is no longer valid. Please restart the connection from Claude."), status: 400 };
  }

  const reissue = () => createPending({
    claudeClientId: pending.claudeClientId,
    claudeRedirectUri: pending.claudeRedirectUri,
    claudeState: pending.claudeState,
    claudeCodeChallenge: pending.claudeCodeChallenge,
    claudeResource: pending.claudeResource,
  });

  if (!params.email || !params.password) {
    const fresh = reissue();
    const { options } = await discoverSignInOptions();
    return {
      pageHtml: renderLoginPage({ state: fresh.ourState, options, error: "Email and password are required.", email: params.email }),
      status: 400,
    };
  }

  let pb;
  try {
    pb = await authWithPassword({ identity: params.email.trim(), password: params.password });
  } catch (err: any) {
    const fresh = reissue();
    const { options } = await discoverSignInOptions();
    return {
      pageHtml: renderLoginPage({ state: fresh.ourState, options, error: err.message || "Sign-in failed", email: params.email }),
      status: 401,
    };
  }

  if (ALLOWED_EMAILS.length && !ALLOWED_EMAILS.includes(pb.email)) {
    return { pageHtml: renderErrorPage("Not authorized", notAllowed(pb.email)), status: 403 };
  }

  return finishSession(pending, pb);
}

/**
 * Handle POST /oauth/reset-request (form submission). Always responds with
 * the login page and a neutral banner; never leaks whether an account exists.
 */
export async function handleResetRequest(params: {
  state: string;
  email: string;
}): Promise<{ pageHtml: string; status: number }> {
  const pending = touchPending(params.state);
  if (!pending) {
    return {
      pageHtml: renderErrorPage("Session expired", "Your sign-in link is no longer valid. Please restart the connection from Claude."),
      status: 400,
    };
  }

  const { options } = await discoverSignInOptions();
  const email = (params.email || "").trim();
  if (!email) {
    return {
      pageHtml: renderLoginPage({ state: pending.ourState, options, error: "Enter an email to send a reset link." }),
      status: 400,
    };
  }

  try {
    await requestPasswordReset(email);
  } catch (err: any) {
    console.error("[reset-request] error:", err.message);
    // Still return the neutral banner to avoid leaking account existence.
  }

  return {
    pageHtml: renderLoginPage({
      state: pending.ourState,
      options,
      email,
      banner: {
        type: "success",
        text: `If ${email} has a Relay.md account, a password reset email is on its way. Check your inbox, set a password, then come back here to sign in.`,
      },
    }),
    status: 200,
  };
}

// ---------------------------------------------------------------------------
// Provider sign-in (Google / GitHub / Microsoft / ...), relayed server-side.
//
// Why not postMessage from the popup: provider sign-in pages (Google's in
// particular) set Cross-Origin-Opener-Policy, which severs the popup's
// window.opener, so the code can never be posted back to the login page.
// Instead we hold an SSE channel to PocketBase (pb-realtime.ts); PocketBase
// pushes the code to us; the login page polls OAUTH2_STATUS_PATH until done.
// ---------------------------------------------------------------------------

type OAuth2Outcome = { redirectUrl: string } | { error: string };

interface OAuth2Flow {
  close: () => void;
  startedAt: number;
  outcome?: OAuth2Outcome;
  deliveredAt?: number;
}

const oauth2Flows = new Map<string, OAuth2Flow>();
const OAUTH2_FLOW_TTL_MS = 15 * 60_000;
const OAUTH2_OUTCOME_LINGER_MS = 5 * 60_000;

function sweepOAuth2Flows(): void {
  const now = Date.now();
  for (const [state, flow] of oauth2Flows) {
    const stale = now - flow.startedAt > OAUTH2_FLOW_TTL_MS;
    const delivered = flow.deliveredAt && now - flow.deliveredAt > OAUTH2_OUTCOME_LINGER_MS;
    if (stale || delivered) {
      flow.close();
      oauth2Flows.delete(state);
    }
  }
}

async function completeOAuth2Flow(
  ourState: string,
  flow: OAuth2Flow,
  relayed: { state: string; code?: string; error?: string }
): Promise<void> {
  if (relayed.error || !relayed.code) {
    flow.outcome = { error: `Sign-in did not complete${relayed.error ? `: ${relayed.error}` : ""}. Try again.` };
    return;
  }

  const pending = consumePending(ourState);
  if (!pending || !pending.oauth2CodeVerifier || !pending.oauth2Provider) {
    flow.outcome = { error: "Your sign-in session expired. Refresh this page and try again." };
    return;
  }

  let pb;
  try {
    pb = await authWithOAuth2({
      provider: pending.oauth2Provider,
      code: relayed.code,
      codeVerifier: pending.oauth2CodeVerifier,
      redirectUri: PB_OAUTH2_REDIRECT_URI,
    });
  } catch (err: any) {
    console.error("[oauth2] auth-with-oauth2 failed:", err?.message || err);
    flow.outcome = { error: err?.message || "Sign-in failed. Refresh this page and try again." };
    return;
  }

  if (ALLOWED_EMAILS.length && !ALLOWED_EMAILS.includes(pb.email)) {
    console.warn(`[oauth2] rejected ${pb.email}: not in ALLOWED_EMAILS`);
    flow.outcome = { error: notAllowed(pb.email) };
    return;
  }

  flow.outcome = finishSession(pending, pb);
  console.log(`[oauth2] signed in ${pb.email} via ${pending.oauth2Provider}`);
}

/**
 * Handle POST /oauth/oauth2/init (fetch from a "Continue with <provider>"
 * button). Opens the SSE relay to PocketBase, fetches a fresh provider entry
 * (authURL + PKCE codeVerifier), and returns an authUrl whose `state` is our
 * relay client id and whose redirect_uri is PocketBase's /api/oauth2-redirect.
 */
export async function handleOAuth2Init(params: {
  state: string;
  provider: string;
}): Promise<{ authUrl: string } | { error: string }> {
  sweepOAuth2Flows();

  const pending = touchPending(params.state);
  if (!pending) return { error: "Your sign-in session expired. Refresh the page and try again." };

  const providerName = (params.provider || "").trim().toLowerCase();
  if (!providerName) return { error: "No sign-in provider was specified." };

  // A retry on the same page replaces any earlier attempt.
  const previous = oauth2Flows.get(params.state);
  if (previous) {
    previous.close();
    oauth2Flows.delete(params.state);
  }

  let methods;
  try {
    methods = await getAuthMethods();
  } catch (err: any) {
    return { error: err.message || "Could not reach Relay.md." };
  }

  const provider = methods.providers.find(p => p.name.toLowerCase() === providerName);
  if (!provider) return { error: `${params.provider} sign-in is not enabled on Relay.md.` };

  let relay;
  try {
    relay = await openOAuth2Relay();
  } catch (err: any) {
    console.error("[oauth2] relay open failed:", err?.message || err);
    return { error: `Could not open a sign-in channel to Relay.md: ${err?.message || err}` };
  }

  const authUrl = new URL(provider.authURL);
  authUrl.searchParams.set("redirect_uri", PB_OAUTH2_REDIRECT_URI);
  authUrl.searchParams.set("state", relay.clientId);

  attachOAuth2Flow(params.state, {
    provider: provider.name,
    codeVerifier: provider.codeVerifier,
    state: relay.clientId,
  });

  const flow: OAuth2Flow = { close: relay.close, startedAt: Date.now() };
  oauth2Flows.set(params.state, flow);

  relay.result
    .then(relayed => completeOAuth2Flow(params.state, flow, relayed))
    .catch((err: any) => {
      console.error("[oauth2] relay failed:", err?.message || err);
      flow.outcome = { error: err?.message || "Sign-in channel to Relay.md dropped. Try again." };
    });

  return { authUrl: authUrl.toString() };
}

/**
 * Handle GET /oauth/oauth2/status?state=... (polled by the login page).
 */
export function handleOAuth2Status(params: {
  state: string;
}): { pending: true } | OAuth2Outcome {
  sweepOAuth2Flows();
  const flow = oauth2Flows.get(params.state);
  if (!flow) return { error: "No sign-in in progress. Click one of the sign-in buttons again." };
  if (!flow.outcome) return { pending: true };
  if (!flow.deliveredAt) flow.deliveredAt = Date.now();
  return flow.outcome;
}
