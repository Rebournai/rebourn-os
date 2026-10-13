/**
 * Local end-to-end smoke test. Runs the BUILT server (dist/index.js) against
 * a mock of Relay.md's PocketBase and drives the full sign-in flow the way
 * Claude + a browser would. No network access needed.
 *
 *   npm run build && npx tsx scripts/smoke-test.ts
 */
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SERVER_PORT = 3999;
const PUBLIC_URL = `http://localhost:${SERVER_PORT}`;
const ALLOWED = "owner@example.com";

function fakePbToken(): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ exp: Math.floor(Date.now() / 1000) + 3600, id: "rec1" })}.sig`;
}

// ---------------------------------------------------------------- mock PB
const sse = new Map<string, http.ServerResponse>();
const subs = new Map<string, string[]>();
let n = 0;
const seenExchanges: any[] = [];

const mock = http.createServer((req, res) => {
  const url = new URL(req.url!, "http://x");
  const json = (code: number, body: unknown) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  const readBody = (cb: (b: string) => void) => { let b = ""; req.on("data", c => (b += c)); req.on("end", () => cb(b)); };

  if (url.pathname === "/api/collections/users/auth-methods") {
    return json(200, {
      authProviders: [
        { name: "google", displayName: "Google", authURL: "https://accounts.google.com/o/oauth2/v2/auth?client_id=cid&code_challenge=cc&code_challenge_method=S256&response_type=code&scope=email&state=pbstate&redirect_uri=", codeVerifier: "VERIFIER-G", codeChallenge: "cc", codeChallengeMethod: "S256", state: "pbstate" },
        { name: "github", displayName: "GitHub", authURL: "https://github.com/login/oauth/authorize?client_id=gh&state=pbstate2&redirect_uri=", codeVerifier: "VERIFIER-GH", codeChallenge: "cc2", codeChallengeMethod: "S256", state: "pbstate2" },
      ],
      emailPassword: true, password: { enabled: false, identityFields: [] }, mfa: { enabled: false }, otp: { enabled: false },
    });
  }
  if (url.pathname === "/api/realtime" && req.method === "GET") {
    const id = "rtclient" + (++n);
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write(`id:${id}\nevent:PB_CONNECT\ndata:${JSON.stringify({ clientId: id })}\n\n`);
    sse.set(id, res); req.on("close", () => sse.delete(id)); return;
  }
  if (url.pathname === "/api/realtime" && req.method === "POST") {
    return readBody(b => { const j = JSON.parse(b); subs.set(j.clientId, j.subscriptions); res.writeHead(204); res.end(); });
  }
  if (url.pathname === "/api/oauth2-redirect") {
    const state = url.searchParams.get("state") || ""; const code = url.searchParams.get("code") || "";
    const c = sse.get(state);
    if (c && (subs.get(state) || []).includes("@oauth2")) {
      c.write(`id:${state}\nevent:@oauth2\ndata:${JSON.stringify({ state, code, error: "" })}\n\n`);
      res.writeHead(307, { Location: "/_/#/auth/oauth2-redirect-success" }); return res.end();
    }
    res.writeHead(307, { Location: "/_/#/auth/oauth2-redirect-failure" }); return res.end();
  }
  if (url.pathname === "/api/collections/users/auth-with-oauth2") {
    return readBody(b => {
      const j = JSON.parse(b); seenExchanges.push(j);
      if (j.provider !== "google" || j.codeVerifier !== "VERIFIER-G" || !j.redirectURL?.endsWith("/api/oauth2-redirect")) return json(400, { message: "bad exchange", got: j });
      const email = j.code === "CODE-OK" ? ALLOWED : "someone.else@example.com";
      return json(200, { token: fakePbToken(), record: { id: "rec1", email } });
    });
  }
  if (url.pathname === "/api/collections/users/auth-with-password") {
    return json(400, { data: {}, message: "The collection is not configured to allow password authentication.", status: 400 });
  }
  if (url.pathname === "/api/collections/users/auth-refresh") return json(200, { token: fakePbToken(), record: { id: "rec1", email: ALLOWED } });
  if (url.pathname === "/api/health") return json(200, { ok: true });
  res.writeHead(404); res.end("mock 404 " + url.pathname);
});

// ---------------------------------------------------------------- helpers
const expect = (cond: unknown, msg: string) => { if (!cond) { console.error("  ✖ " + msg); process.exitCode = 1; throw new Error(msg); } console.log("  ✔ " + msg); };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  await new Promise<void>(r => mock.listen(0, r));
  const PB = `http://127.0.0.1:${(mock.address() as any).port}`;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "rvm-smoke-"));

  const server = spawn("node", ["dist/index.js"], {
    env: { ...process.env, PORT: String(SERVER_PORT), PUBLIC_URL, PB_AUTH_URL: PB, RELAY_API_URL: PB, PB_COLLECTION: "users",
      JWT_SECRET: crypto.randomBytes(32).toString("hex"), DATA_DIR: dataDir, ALLOWED_EMAILS: ALLOWED },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  server.stdout.on("data", d => (serverLog += d)); server.stderr.on("data", d => (serverLog += d));
  const stop = () => { server.kill(); mock.close(); for (const r of sse.values()) r.end(); };

  try {
    for (let i = 0; i < 50; i++) { try { await fetch(`${PUBLIC_URL}/health`); break; } catch { await sleep(100); } }

    console.log("1. health");
    const health = await (await fetch(`${PUBLIC_URL}/health`)).json();
    expect(health.status === "ok" && health.product === "Rebourn Vault MCP" && health.version === "2.1.0", `health reports product/version: ${JSON.stringify(health)}`);

    console.log("2. discovery + dynamic client registration");
    const prm = await (await fetch(`${PUBLIC_URL}/.well-known/oauth-protected-resource/mcp`)).json();
    expect(prm.resource === `${PUBLIC_URL}/mcp`, "protected-resource metadata served at /.well-known/oauth-protected-resource/mcp");
    const reg = await (await fetch(`${PUBLIC_URL}/register`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirect_uris: ["http://localhost:1/cb"], client_name: "smoke", token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] }) })).json();
    expect(reg.client_id, "client registered");

    console.log("3. /authorize renders provider buttons from live auth-methods");
    const verifier = crypto.randomBytes(32).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    const authz = new URL(`${PUBLIC_URL}/authorize`);
    Object.entries({ response_type: "code", client_id: reg.client_id, redirect_uri: "http://localhost:1/cb", code_challenge: challenge, code_challenge_method: "S256", state: "claude-state-123", resource: `${PUBLIC_URL}/mcp` })
      .forEach(([k, v]) => authz.searchParams.set(k, v));
    const pageRes = await fetch(authz); const page = await pageRes.text();
    expect(pageRes.status === 200, "authorize returns 200");
    expect(page.includes("Continue with Google") && page.includes("Continue with GitHub"), "Google + GitHub buttons rendered");
    expect(!page.includes('name="password"'), "password form hidden because PocketBase has password auth disabled");
    expect(page.includes("Sign in to Rebourn Vault MCP"), "branded title");
    const ourState = page.match(/var OUR_STATE = "([a-f0-9]+)"/)?.[1]; expect(ourState, "page carries OUR_STATE");

    console.log("4. provider init opens the SSE relay and returns a provider URL");
    const init = await (await fetch(`${PUBLIC_URL}/oauth/oauth2/init`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: ourState, provider: "google" }) })).json();
    expect(init.authUrl, `authUrl returned: ${init.authUrl?.slice(0, 60)}...`);
    const authUrl = new URL(init.authUrl);
    expect(authUrl.searchParams.get("redirect_uri") === `${PB}/api/oauth2-redirect`, "redirect_uri is PocketBase's /api/oauth2-redirect");
    const rtState = authUrl.searchParams.get("state")!;
    expect(rtState.startsWith("rtclient") && subs.get(rtState)?.includes("@oauth2"), `state is our realtime client id and it is subscribed to @oauth2 (${rtState})`);
    expect(authUrl.searchParams.getAll("redirect_uri").length === 1 && authUrl.searchParams.getAll("state").length === 1, "no duplicated query params");

    const st0 = await (await fetch(`${PUBLIC_URL}/oauth/oauth2/status?state=${ourState}`)).json();
    expect(st0.pending === true, "status is pending before the provider redirect");

    console.log("5. provider redirects to PocketBase, which relays the code to the server");
    await fetch(`${PB}/api/oauth2-redirect?state=${rtState}&code=CODE-OK`, { redirect: "manual" });
    let st: any = { pending: true };
    for (let i = 0; i < 40 && st.pending; i++) { await sleep(100); st = await (await fetch(`${PUBLIC_URL}/oauth/oauth2/status?state=${ourState}`)).json(); }
    expect(st.redirectUrl, `status resolved to a redirect: ${st.redirectUrl}`);
    const cb = new URL(st.redirectUrl);
    expect(cb.origin + cb.pathname === "http://localhost:1/cb" && cb.searchParams.get("state") === "claude-state-123", "redirect goes to Claude's callback with Claude's state");
    expect(seenExchanges[0]?.redirectURL && seenExchanges[0]?.codeVerifier === "VERIFIER-G", "auth-with-oauth2 called with redirectURL + the stored code verifier");

    console.log("6. token exchange (PKCE) and an authenticated MCP call");
    const tok = await (await fetch(`${PUBLIC_URL}/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code: cb.searchParams.get("code")!, code_verifier: verifier, client_id: reg.client_id, redirect_uri: "http://localhost:1/cb", resource: `${PUBLIC_URL}/mcp` }) })).json();
    expect(tok.access_token && tok.refresh_token, "access + refresh tokens issued");
    const mcpInit = await fetch(`${PUBLIC_URL}/mcp`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer ${tok.access_token}` },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "1" } } }) });
    const sid = mcpInit.headers.get("mcp-session-id")!;
    const initBody = await mcpInit.json();
    expect(mcpInit.status === 200 && initBody.result?.serverInfo?.title === "Rebourn Vault MCP", `MCP initialize ok, serverInfo: ${JSON.stringify(initBody.result?.serverInfo)}`);
    const tools = await (await fetch(`${PUBLIC_URL}/mcp`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer ${tok.access_token}`, "mcp-session-id": sid },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) })).json();
    const names = (tools.result?.tools || []).map((t: any) => t.name);
    expect(names.length === 10 && names.includes("vault_read") && names.includes("vault_relays"), `tools/list returns the 10 vault tools`);
    const unauth = await fetch(`${PUBLIC_URL}/mcp`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: "{}" });
    expect(unauth.status === 401 && /resource_metadata=/.test(unauth.headers.get("www-authenticate") || ""), "unauthenticated /mcp gets 401 with resource_metadata hint");

    console.log("7. ALLOWED_EMAILS rejects another account");
    const page2 = await (await fetch(authz)).text();
    const ourState2 = page2.match(/var OUR_STATE = "([a-f0-9]+)"/)![1];
    const init2 = await (await fetch(`${PUBLIC_URL}/oauth/oauth2/init`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: ourState2, provider: "google" }) })).json();
    const rt2 = new URL(init2.authUrl).searchParams.get("state")!;
    await fetch(`${PB}/api/oauth2-redirect?state=${rt2}&code=CODE-OTHER`, { redirect: "manual" });
    let st2: any = { pending: true };
    for (let i = 0; i < 40 && st2.pending; i++) { await sleep(100); const r = await fetch(`${PUBLIC_URL}/oauth/oauth2/status?state=${ourState2}`); st2 = await r.json(); }
    expect(/not in the allow-list/.test(st2.error || ""), `rejected: ${st2.error}`);

    console.log("8. password path reports PocketBase's 'disabled' clearly");
    const page3 = await (await fetch(authz)).text();
    const ourState3 = page3.match(/var OUR_STATE = "([a-f0-9]+)"/)![1];
    const pw = await fetch(`${PUBLIC_URL}/oauth/login`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ state: ourState3, email: "a@b.c", password: "x" }) });
    const pwText = await pw.text();
    expect(pw.status === 401 && /does not allow password sign-in/.test(pwText), "clear message instead of 'invalid email or password'");

    console.log("9. unknown provider is refused");
    const page4 = await (await fetch(authz)).text();
    const ourState4 = page4.match(/var OUR_STATE = "([a-f0-9]+)"/)![1];
    const bad = await (await fetch(`${PUBLIC_URL}/oauth/oauth2/init`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: ourState4, provider: "facebook" }) })).json();
    expect(/not enabled/.test(bad.error || ""), `refused: ${bad.error}`);

    expect(/\[oauth2\] signed in owner@example\.com via google/.test(serverLog), "server logged the sign-in");
    console.log("\nALL_OK");
  } catch (err: any) {
    console.error("\nFAILED:", err.message);
    console.error("--- server log ---\n" + serverLog);
    process.exitCode = 1;
  } finally {
    stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

main();
