# Rebourn Vault MCP — how sign-in works

The server is both an OAuth 2.1 **resource server** (it protects `/mcp`) and an OAuth 2.1 **authorization server** (Claude registers with it, sends the user to `/authorize`, and exchanges a code at `/token`). Identity is delegated to Relay.md: the user proves who they are to Relay.md's PocketBase, and the server keeps a per-user PocketBase token that it uses for every vault call on that user's behalf.

## Sign-in methods on the page

`/authorize` asks Relay.md's PocketBase (`GET /api/collections/users/auth-methods`) what is enabled and renders exactly that:

- One **"Continue with <Provider>"** button per OAuth2 provider Relay.md has configured (today: Google, GitHub, Microsoft).
- The **email + password** form only when PocketBase reports password auth as enabled. On hosted Relay.md it is disabled, so the form does not appear and users cannot set a password there.

## Provider sign-in (Google / GitHub / Microsoft)

Provider sign-in cannot use the usual "popup posts the code back to the page" trick: Google's sign-in pages set `Cross-Origin-Opener-Policy`, which severs the popup's `window.opener`, so the message never arrives. The server therefore relays the code itself, using the same mechanism PocketBase's own SDK uses:

1. The page POSTs `/oauth/oauth2/init` with `{ state, provider }`.
2. The server opens a Server-Sent Events channel to `PB_AUTH_URL/api/realtime`, receives a realtime **client id**, and subscribes that client to the `@oauth2` topic (`src/auth/pb-realtime.ts`).
3. The server fetches a fresh provider entry from `auth-methods` (it contains a PKCE `codeVerifier`), builds the provider's authorization URL with `redirect_uri = PB_AUTH_URL/api/oauth2-redirect` and `state = <realtime client id>`, stores the code verifier against the pending flow, and returns the URL.
4. The page opens the URL in a popup. The user signs in with the provider.
5. The provider redirects to PocketBase's `/api/oauth2-redirect`. PocketBase looks up the realtime client named by `state` and pushes `{ state, code }` to it over the SSE channel. (That endpoint is already registered with each provider's OAuth app on Relay.md's side, so no redirect URI of ours ever needs allow-listing.)
6. The server exchanges the code: `POST /api/collections/users/auth-with-oauth2` with `{ provider, code, codeVerifier, redirectURL }`, gets a PocketBase token and the user's email, checks `ALLOWED_EMAILS`, creates a session, and mints the authorization code for Claude.
7. Meanwhile the page polls `GET /oauth/oauth2/status?state=...` once a second; when the outcome is ready it redirects the browser to Claude's callback with the code. The popup shows PocketBase's "you can close this window" page and usually closes itself.

Timeouts: a flow is abandoned after 10 minutes (SSE channel closed, page shows a retry).

## Email + password

Only offered when PocketBase has it enabled. `POST /oauth/login` calls `auth-with-password`; `POST /oauth/reset-request` calls `request-password-reset` and always answers with a neutral banner so it never leaks whether an account exists.

## Tokens

- **Access tokens** for Claude are HS256 JWTs signed with `JWT_SECRET` (`src/auth/tokens.ts`), short-lived, with refresh tokens stored server-side.
- **PocketBase tokens** are stored encrypted at rest in `DATA_DIR/sessions.enc` (key derived from `JWT_SECRET`). A background loop refreshes any token within 6 hours of expiry every 30 minutes; a tool call also refreshes inline when the token is within 5 minutes of expiry.
- **Static bearer** (`STATIC_MCP_BEARER`): accepted on `/mcp` and `/diag` without OAuth, for scripts. Vault calls made this way use `RELAY_AUTH_TOKEN`, so set both or neither. Keep it private; it is as powerful as a signed-in user.

## Environment variables

| Var | Required | Purpose |
|-----|----------|---------|
| `PUBLIC_URL` | yes (Railway: derived from `RAILWAY_PUBLIC_DOMAIN` if unset) | OAuth issuer and audience; must be the URL clients use. |
| `JWT_SECRET` | yes, >= 32 chars | Signs access tokens and encrypts the session store. Rotate to sign everyone out. |
| `PB_AUTH_URL` | yes | PocketBase auth host, `https://auth.system3.md` for hosted Relay.md. |
| `PB_COLLECTION` | no (default `users`) | PocketBase auth collection. |
| `RELAY_API_URL` | yes | Relay backend, `https://api.system3.md` for hosted Relay.md. |
| `ALLOWED_EMAILS` | recommended | Comma-separated allow-list of Relay.md account emails. Empty = any Relay.md user. Always set for client deployments. |
| `RELAY_ID` | no | Pin a vault GUID. Empty = the first relay the user can access. |
| `STATIC_MCP_BEARER` | no | Long-lived bearer for scripts. |
| `RELAY_AUTH_TOKEN` | only with static bearer | PocketBase token used for upstream calls in static-bearer mode. |
| `DATA_DIR` | yes | Persistent directory (mount a volume). |
| `PORT` | no (default 3000) | Listen port. |

## Operational notes

- **Revoke one session:** stop the server, delete the entry from `DATA_DIR/sessions.enc` (or delete the file), restart. The user signs in again.
- **Rotate `JWT_SECRET`:** set the new value and redeploy. All access tokens and the encrypted session store become invalid; everyone signs in again.
- **Force a client to re-register:** delete its entry from `DATA_DIR/clients.json`. Claude re-registers via dynamic client registration on the next connect.
- **Restrict who can sign in:** set `ALLOWED_EMAILS` and redeploy. Existing sessions of removed users keep working until their PocketBase token refresh fails; delete their session entries to cut them off immediately.
- **Multiple relays:** the signed-in user may have access to several relays. `vault_relays` shows which is active; pin one with `RELAY_ID`.
