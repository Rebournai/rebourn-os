# Rebourn Vault MCP

Gives Claude (claude.ai, Claude Code, Cowork) secure read/write access to an Obsidian vault that is synced through [Relay.md](https://relay.md). One small server per client, deployed to Railway in a few minutes.

```
 Claude (claude.ai / Claude Code / Cowork)
        │  MCP over HTTPS, OAuth 2.1
        ▼
 Rebourn Vault MCP  (this server, on Railway; stores no notes)
        │  Relay.md API, on behalf of the signed-in user
        ▼
 Relay.md  ──  keeps the vault in sync  ──  Obsidian on every machine
```

- **Relay.md** holds the shared copy of the notes and does the syncing. Accounts, folder sharing and permissions live there.
- **This server** is a bridge. Every tool call from Claude becomes a Relay.md call as the user who signed in. If the server disappears, nothing in the vault is lost.
- **Railway** is just the machine it runs on.

Tools exposed to Claude: `vault_relays`, `vault_folders`, `vault_list`, `vault_read`, `vault_search`, `vault_write`, `vault_update`, `vault_append`, `vault_move`, `vault_delete`.

---

## Prerequisites

Client side (one-time, before deploying):

1. The client's vault is in Obsidian with the **Relay** community plugin installed, signed in to Relay.md, and the folders Claude should see are shared in a relay.
2. You know which Relay.md account (email + provider: Google/GitHub/Microsoft) will be used to sign in to the MCP. That account must have access to the relay.

Your side:

- A [Railway](https://railway.com) account (the client's own account is best for client deployments, so billing and ownership are theirs).
- The Railway CLI: `brew install railway` or `npm i -g @railway/cli`.
- `curl` and `openssl` (present on macOS and Linux).

> Deploying needs network access to `railway.com`. If your terminal is behind a policy that blocks it (Claude's sandboxed shells are), run the deploy from a normal terminal.

## Deploy (new client)

```bash
unzip rebourn-vault-mcp-2.1.0.zip
cd rebourn-vault-mcp
bash scripts/deploy.sh new
```

The script will:

1. check the Railway CLI and log you in (browser) if needed;
2. run `railway init` (name the project after the client, e.g. `acme-vault-mcp`) and add a `/data` volume;
3. assign a public domain;
4. generate `JWT_SECRET` and `STATIC_MCP_BEARER`, ask for **`ALLOWED_EMAILS`** (the client's Relay.md emails; do not leave this empty for a client) and an optional `RELAY_ID`, and set every variable;
5. upload, build, wait for `/health`, and print the connector URL.

Save the printed `STATIC_MCP_BEARER` in a password manager; it is not shown again.

Prefer to do it by hand, or use Railway's dashboard? See [Manual deployment](#manual-deployment).

## Connect Claude

Endpoint: `https://<your-domain>/mcp`

- **claude.ai**: Settings → Connectors → Add custom connector → paste the endpoint → sign in with the client's Relay.md account using the provider button (Google/GitHub/Microsoft). The connector then also shows up in Claude Code (`/mcp`) and Cowork for that account.
- **Claude Code only**: `claude mcp add --transport http vault https://<your-domain>/mcp`, then `/mcp` → authenticate.

Verify: in a new Claude conversation ask *"list my Relay vaults, then list the vault folders"*. You should see the client's relay marked active and their folder names.

## Update an existing deployment

From the folder that was deployed (it is linked to the Railway project):

```bash
bash scripts/deploy.sh update      # or simply: railway up
```

Environment variables are kept. To change one: `railway variables --set ALLOWED_EMAILS=a@x.com,b@x.com` (the service redeploys).

## Per-client checklist

- [ ] Client's vault shared in Relay.md; sign-in account has access to the relay.
- [ ] Deployed in the client's Railway account (or yours, per the agreement).
- [ ] `ALLOWED_EMAILS` set to the client's emails only.
- [ ] `RELAY_ID` pinned if the account can see more than one relay (`vault_relays` shows the GUIDs).
- [ ] Connector added in the client's claude.ai; `vault_folders` returns their folders.
- [ ] `STATIC_MCP_BEARER` stored in the password manager, not in chat or email.
- [ ] Client told: keep Obsidian open when files are edited outside Obsidian (see below).

## Things to know

**Relay syncs from inside Obsidian.** Files written straight to disk while Obsidian is closed (by scripts, Claude Code file edits, Cowork) may be overwritten by Relay's copy on the next sync. Writes through this MCP land in the shared copy directly and are safe. If something writes to disk, keep Obsidian open so Relay picks it up immediately.

**Sign-in methods** are whatever Relay.md's backend enables. Hosted Relay.md accounts are OAuth-only (Google, GitHub, Microsoft); there is no password to set. The sign-in page reflects this automatically. Details in [AUTH.md](AUTH.md).

**Who can sign in** is controlled by `ALLOWED_EMAILS`. With it empty, any Relay.md user can sign in and will see whichever relays *their* account can access. That is acceptable for your own vault, never for a client's.

**Secrets.** `JWT_SECRET` signs Claude's tokens and encrypts stored Relay.md tokens; rotating it signs everyone out. `STATIC_MCP_BEARER` bypasses OAuth for scripts and is only useful together with `RELAY_AUTH_TOKEN`; leave both unset if you do not need script access.

## Manual deployment

Equivalent to what the script does:

```bash
railway login                      # or export RAILWAY_API_TOKEN=...
railway init                       # new project; or: railway link
railway volume add --mount-path /data
railway domain                     # note the URL
bash scripts/gen-secrets.sh        # JWT_SECRET, STATIC_MCP_BEARER
railway variables \
  --set RELAY_API_URL=https://api.system3.md \
  --set PB_AUTH_URL=https://auth.system3.md \
  --set PB_COLLECTION=users \
  --set DATA_DIR=/data --set PORT=3000 \
  --set PUBLIC_URL=https://<domain> \
  --set JWT_SECRET=<generated> \
  --set STATIC_MCP_BEARER=<generated> \
  --set ALLOWED_EMAILS=client@example.com
railway up
curl https://<domain>/health       # {"status":"ok","product":"Rebourn Vault MCP","version":"2.1.0",...}
```

Any Docker host works too: build the `Dockerfile`, mount a persistent volume at `DATA_DIR`, set the same variables, expose `PORT`.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Claude says the connector is "unauthorized" after sign-in | The browser flow did not finish. Redo it from a fresh `/mcp` → authenticate; watch `railway logs` for `[oauth2] signed in <email>`. |
| Sign-in page shows no provider buttons and an error banner | The server could not reach `PB_AUTH_URL`. Check the variable and Relay.md status. |
| "not in the allow-list for this server" | Add the email to `ALLOWED_EMAILS` (`railway variables --set ...`). |
| `vault_relays` says no relays accessible | The signed-in Relay.md account is not a member of any relay. Share the vault with it in the Relay plugin. |
| `vault_folders` is empty | The active relay has no shared folders, or the wrong relay is active; pin with `RELAY_ID`. |
| Build fails: "Railpack could not determine how to build" | `railway up` was run from the wrong folder. Run `scripts/deploy.sh` (it always deploys the project folder) or `cd` into the folder with `package.json`. |
| "413 Payload Too Large" on upload | Same cause: the wrong (huge) folder was uploaded. |
| OAuth loops back to the sign-in page | `PUBLIC_URL` does not match the domain clients use. Fix and redeploy. |
| Popup blocked | Allow popups for the server's domain; the page also offers a direct link. |

Logs: `railway logs`. Every request is logged as `[req] METHOD path`; sign-ins as `[oauth2] signed in ...`.

## Project layout

```
src/index.ts            Express app, MCP server + tools, routes
src/branding.ts         Product name/version (one place)
src/config.ts           Environment variables
src/relay-client.ts     Relay.md API + Yjs document access
src/auth/provider.ts    OAuth 2.1 server, sign-in page, provider flow
src/auth/pb-realtime.ts SSE relay to PocketBase (@oauth2 topic)
src/auth/pocketbase.ts  PocketBase auth calls
src/auth/*.ts           sessions, codes, tokens, pending flows, client registry
scripts/deploy.sh       Guided Railway deploy / update
scripts/gen-secrets.sh  Secrets generator
Dockerfile, railway.json
```

## License

Proprietary. Copyright (c) 2026 Rebourn.ai. See [LICENSE](LICENSE). Clients receive a right to run their deployed instance under their service agreement.
