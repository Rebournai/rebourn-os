import crypto from "node:crypto";
import path from "node:path";
import { DATA_DIR } from "../config.js";
import { loadJson, saveJson } from "./jsonfile.js";

export interface PendingAuth {
  ourState: string;
  claudeClientId: string;
  claudeRedirectUri: string;
  claudeState?: string;
  claudeCodeChallenge: string;
  claudeResource?: string;
  expiresAt: number;
  // Set by /oauth/oauth2/init once a provider (Google/GitHub/...) sign-in
  // has been started for this pending entry; used when the relayed code is
  // exchanged with PocketBase.
  oauth2Provider?: string;
  oauth2CodeVerifier?: string;
  oauth2State?: string;
}

const PENDING_FILE = path.join(DATA_DIR, "pending.json");
const TTL_MS = 30 * 60_000;

type Store = Record<string, PendingAuth>;

let cache: Store | null = null;

function load(): Store {
  if (cache) return cache;
  cache = loadJson<Store>(PENDING_FILE, {});
  return cache;
}

function persist(): void {
  if (!cache) return;
  saveJson(PENDING_FILE, cache);
}

function sweep(): boolean {
  const store = load();
  const now = Date.now();
  let dirty = false;
  for (const [state, entry] of Object.entries(store)) {
    if (entry.expiresAt < now) {
      delete store[state];
      dirty = true;
    }
  }
  return dirty;
}

export function createPending(data: Omit<PendingAuth, "ourState" | "expiresAt">): PendingAuth {
  sweep();
  const store = load();
  const ourState = crypto.randomBytes(24).toString("hex");
  const entry: PendingAuth = { ...data, ourState, expiresAt: Date.now() + TTL_MS };
  store[ourState] = entry;
  persist();
  return entry;
}

export function consumePending(ourState: string): PendingAuth | undefined {
  sweep();
  const store = load();
  const entry = store[ourState];
  if (!entry) return undefined;
  delete store[ourState];
  persist();
  return entry;
}

export function peekPending(ourState: string): PendingAuth | undefined {
  if (sweep()) persist();
  return load()[ourState];
}

/**
 * Look up without consuming, and extend the TTL so slower flows
 * (e.g., waiting for a reset email) don't expire mid-flow.
 */
export function touchPending(ourState: string): PendingAuth | undefined {
  sweep();
  const store = load();
  const entry = store[ourState];
  if (!entry) return undefined;
  entry.expiresAt = Date.now() + TTL_MS;
  persist();
  return entry;
}

/**
 * Attach (or overwrite) the provider OAuth2 flow details for an existing
 * pending entry, without consuming it. Used by /oauth/oauth2/init so the
 * PKCE codeVerifier survives until the relayed code is exchanged.
 */
export function attachOAuth2Flow(
  ourState: string,
  data: { provider: string; codeVerifier: string; state: string }
): PendingAuth | undefined {
  sweep();
  const store = load();
  const entry = store[ourState];
  if (!entry) return undefined;
  entry.oauth2Provider = data.provider;
  entry.oauth2CodeVerifier = data.codeVerifier;
  entry.oauth2State = data.state;
  entry.expiresAt = Date.now() + TTL_MS;
  persist();
  return entry;
}
