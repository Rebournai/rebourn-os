import { PB_AUTH_URL } from "../config.js";

/**
 * Server-side relay for PocketBase's OAuth2 popup flow.
 *
 * PocketBase's /api/oauth2-redirect handler (the redirect_uri registered with
 * Google/GitHub/etc on Relay.md's side) does not depend on window.opener: it
 * reads `state` from the provider's redirect, treats it as a realtime (SSE)
 * client id, and pushes `{ state, code, error }` to that client on the
 * "@oauth2" topic. That is how PocketBase's own JS SDK completes sign-in.
 *
 * Google's sign-in pages set Cross-Origin-Opener-Policy, which severs the
 * popup <-> opener link, so a browser-side postMessage relay silently fails.
 * Instead, THIS server opens the SSE channel, subscribes to "@oauth2", and
 * uses its own client id as the OAuth `state`. The browser only needs to
 * open the provider URL; the code comes back to us over the SSE channel.
 */

export interface OAuth2RelayResult {
  state: string;
  code?: string;
  error?: string;
}

export interface OAuth2Relay {
  /** PocketBase realtime client id; must be sent as the OAuth `state`. */
  clientId: string;
  /** Resolves when PocketBase relays the provider redirect for this client. */
  result: Promise<OAuth2RelayResult>;
  /** Tear down the SSE connection. Safe to call more than once. */
  close: () => void;
}

const DEFAULT_TIMEOUT_MS = 10 * 60_000;

export async function openOAuth2Relay(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<OAuth2Relay> {
  const ac = new AbortController();

  const res = await fetch(`${PB_AUTH_URL}/api/realtime`, {
    headers: { Accept: "text/event-stream", "Cache-Control": "no-cache" },
    signal: ac.signal,
  });
  if (!res.ok || !res.body) {
    ac.abort();
    throw new Error(`PB realtime connect failed (${res.status})`);
  }

  let closed = false;
  let resolveClientId!: (id: string) => void;
  let rejectClientId!: (err: Error) => void;
  const clientIdPromise = new Promise<string>((resolve, reject) => {
    resolveClientId = resolve;
    rejectClientId = reject;
  });

  let resolveResult!: (r: OAuth2RelayResult) => void;
  let rejectResult!: (err: Error) => void;
  const result = new Promise<OAuth2RelayResult>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  // Nobody may end up awaiting `result` (user abandons the flow); make sure a
  // late rejection never becomes an unhandled-rejection crash.
  result.catch(() => {});
  clientIdPromise.catch(() => {});

  const timer = setTimeout(() => fail(new Error("timed out waiting for the sign-in to finish")), timeoutMs);

  function close(): void {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    ac.abort();
  }

  function fail(err: Error): void {
    if (closed) return;
    rejectClientId(err);
    rejectResult(err);
    close();
  }

  // Pump the SSE stream in the background.
  (async () => {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);

          let event = "message";
          const dataLines: string[] = [];
          for (const raw of frame.split("\n")) {
            const line = raw.replace(/\r$/, "");
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
          }
          const data = dataLines.join("\n");

          if (event === "PB_CONNECT") {
            try {
              const parsed = JSON.parse(data) as { clientId?: string };
              if (parsed.clientId) resolveClientId(String(parsed.clientId));
            } catch {
              /* ignore malformed connect frame; wait for a proper one */
            }
          } else if (event === "@oauth2") {
            try {
              const parsed = JSON.parse(data) as { state?: string; code?: string; error?: string };
              resolveResult({
                state: String(parsed.state || ""),
                code: parsed.code || undefined,
                error: parsed.error || undefined,
              });
            } catch {
              fail(new Error("PB realtime sent an unreadable @oauth2 payload"));
            }
            close();
            return;
          }
        }
      }
      fail(new Error("PB realtime connection closed before the sign-in finished"));
    } catch (err: any) {
      if (!closed) fail(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  const clientId = await clientIdPromise;

  // Register the @oauth2 subscription for this client. PocketBase only relays
  // the redirect to clients that hold this subscription.
  const sub = await fetch(`${PB_AUTH_URL}/api/realtime`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, subscriptions: ["@oauth2"] }),
  });
  if (!sub.ok && sub.status !== 204) {
    const text = await sub.text().catch(() => "");
    const err = new Error(`PB realtime subscribe failed (${sub.status}): ${text}`);
    fail(err);
    throw err;
  }

  return { clientId, result, close };
}
