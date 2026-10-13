# Changelog

## 2.1.0 — 2026-09-20

First release as **Rebourn Vault MCP** (previously "Relay MCP v2" / relay-mcp-server).

### Added
- Provider sign-in (Google, GitHub, Microsoft, whatever Relay.md enables), discovered live from Relay.md's `auth-methods`. Needed because hosted Relay.md accounts are OAuth-only and cannot set a password.
- Server-side sign-in relay over PocketBase realtime (SSE). Google's sign-in pages set Cross-Origin-Opener-Policy, which breaks the usual popup-to-page handoff; the server now receives the code directly from PocketBase (`src/auth/pb-realtime.ts`).
- `scripts/deploy.sh`: guided Railway deployment (new project or update), including volume, domain, secrets, `ALLOWED_EMAILS`, health check and connector instructions. `scripts/gen-secrets.sh` for secrets on their own.
- `PUBLIC_URL` falls back to Railway's `RAILWAY_PUBLIC_DOMAIN` when unset.
- `/health` now reports `product` and `version`.
- `.railwayignore`, `.dockerignore`, `.gitignore`, README, CHANGELOG, refreshed AUTH.md and `.env.example`.
- Proprietary Rebourn.ai license.

### Changed
- Product/branding: server name `rebourn-vault`, title "Rebourn Vault MCP", sign-in page retitled.
- The email + password form is only rendered when Relay.md's backend actually allows password sign-in; a clearer error is shown if PocketBase rejects password auth as disabled.
- `auth-with-oauth2` sends `redirectURL` (PocketBase's field name); the earlier `redirectUri` would have been ignored.

### Removed
- Browser-side `postMessage` handling of the provider popup (replaced by the SSE relay).
- `/oauth/google/*` routes (replaced by provider-generic `/oauth/oauth2/init` and `/oauth/oauth2/status`).

## 2.0.0

Original relay-mcp-server v2: OAuth 2.1 server for Claude, email + password sign-in against Relay.md's PocketBase, vault tools (`vault_relays`, `vault_folders`, `vault_list`, `vault_read`, `vault_search`, `vault_write`, `vault_update`, `vault_append`, `vault_move`, `vault_delete`).
