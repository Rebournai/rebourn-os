#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Rebourn Vault MCP: deploy to Railway, or push an update to an existing
# deployment. Works on macOS (bash 3.2) and Linux.
#
#   bash scripts/deploy.sh            # guided: new deployment or update
#   bash scripts/deploy.sh update     # just push the current code
#   bash scripts/deploy.sh new        # create a new Railway project
#
# What it does for a NEW deployment:
#   1. checks the Railway CLI and your login
#   2. creates the Railway project + service and a /data volume
#   3. gives the service a public domain
#   4. generates secrets, asks for the allowed sign-in emails, sets all env vars
#   5. uploads and builds the code, waits for /health, prints the connector URL
#
# Run it from anywhere; it always deploys THIS folder (the one containing
# package.json), never the folder you happen to be standing in.
# ---------------------------------------------------------------------------
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
ok()   { printf '  \033[32m✔\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✖\033[0m %s\n' "$*" >&2; exit 1; }
ask()  { local reply; printf '  %s ' "$1" >&2; read -r reply; printf '%s' "$reply"; }

# --- 0. sanity -------------------------------------------------------------
[ -f package.json ] && [ -f Dockerfile ] && [ -d src ] \
  || die "This does not look like the rebourn-vault-mcp folder: $PROJECT_DIR"

if [ -d node_modules ] && [ ! -f .railwayignore ]; then
  die "node_modules exists but .railwayignore is missing; the upload would be huge. Restore .railwayignore first."
fi

MODE="${1:-}"
case "$MODE" in ""|new|update) ;; *) die "Unknown mode '$MODE' (use: new | update)";; esac

bold "Rebourn Vault MCP deploy"
info "Project folder: $PROJECT_DIR"
echo

# --- 1. Railway CLI + login -------------------------------------------------
if ! command -v railway >/dev/null 2>&1; then
  warn "Railway CLI not found."
  info "Install it with one of:"
  info "  brew install railway"
  info "  npm i -g @railway/cli"
  die "Then run this script again."
fi
ok "Railway CLI $(railway --version 2>/dev/null | head -1)"

if ! railway whoami >/dev/null 2>&1; then
  if [ -n "${RAILWAY_API_TOKEN:-}" ]; then
    die "RAILWAY_API_TOKEN is set but Railway rejected it. Regenerate it at https://railway.com/account/tokens"
  fi
  warn "Not logged in to Railway. Opening the browser login..."
  railway login
  railway whoami >/dev/null 2>&1 || die "Railway login did not complete."
fi
ok "Logged in as $(railway whoami 2>/dev/null | tail -1)"

# --- 2. New project or existing? --------------------------------------------
LINKED=0
if railway status >/dev/null 2>&1; then LINKED=1; fi

if [ -z "$MODE" ]; then
  if [ "$LINKED" = 1 ]; then
    echo
    railway status 2>/dev/null | sed -n '1,12p' | sed 's/^/  /'
    echo
    reply="$(ask 'This folder is linked to the Railway project above. Push an update to it? [Y/n]')"
    case "$reply" in n|N|no|NO) MODE=new ;; *) MODE=update ;; esac
  else
    MODE=new
  fi
fi

NEW_SECRETS=0
if [ "$MODE" = new ]; then
  echo
  bold "Creating a new deployment"
  reply="$(ask 'Create a NEW Railway project (n), or LINK this folder to an existing project/service (l)? [n/l]')"
  case "$reply" in
    l|L)
      railway link
      ;;
    *)
      info "Railway will ask for a project name. Use the client's name, e.g. 'acme-vault-mcp'."
      railway init
      ;;
  esac
  railway status >/dev/null 2>&1 || die "The folder is still not linked to a Railway project."

  # Persistent volume for sessions.enc / clients.json / pending.json.
  if railway volume add --mount-path /data >/dev/null 2>&1; then
    ok "Volume mounted at /data"
  else
    warn "Could not add a volume at /data (it may already exist). Continuing."
  fi

  # Public domain first, so PUBLIC_URL can be set before the first boot.
  DOMAIN="$(railway domain 2>/dev/null | grep -oE 'https://[A-Za-z0-9.-]+' | head -1 || true)"
  if [ -z "$DOMAIN" ]; then
    warn "Could not read the public domain from 'railway domain'."
    DOMAIN="$(ask 'Paste the service URL shown in the Railway dashboard (https://...):')"
  fi
  DOMAIN="${DOMAIN%/}"
  ok "Public URL: $DOMAIN"

  # Secrets + configuration.
  JWT_SECRET="$(openssl rand -hex 32)"
  STATIC_MCP_BEARER="$(openssl rand -hex 24)"
  NEW_SECRETS=1

  echo
  info "Who may sign in to this instance? Enter the Relay.md account emails, comma-separated."
  info "Leave empty to allow ANY Relay.md user (fine for your own vault, not for a client)."
  ALLOWED_EMAILS="$(ask 'ALLOWED_EMAILS:')"
  RELAY_ID="$(ask 'RELAY_ID (leave empty to auto-pick the first relay the user can access):')"

  set -- \
    --set "RELAY_API_URL=https://api.system3.md" \
    --set "PB_AUTH_URL=https://auth.system3.md" \
    --set "PB_COLLECTION=users" \
    --set "DATA_DIR=/data" \
    --set "PORT=3000" \
    --set "PUBLIC_URL=$DOMAIN" \
    --set "JWT_SECRET=$JWT_SECRET" \
    --set "STATIC_MCP_BEARER=$STATIC_MCP_BEARER" \
    --set "ALLOWED_EMAILS=$ALLOWED_EMAILS" \
    --set "RELAY_ID=$RELAY_ID"

  if ! railway variables --skip-deploys "$@" >/dev/null 2>&1; then
    railway variables "$@" >/dev/null
  fi
  ok "Environment variables set"
fi

# --- 3. Upload + build -------------------------------------------------------
echo
bold "Uploading and building"
SIZE="$(du -sh . 2>/dev/null | cut -f1)"
info "Upload size (should be well under 1 MB): $SIZE"
railway up --detach
ok "Build started"

# --- 4. Wait for health -------------------------------------------------------
if [ "${DOMAIN:-}" = "" ]; then
  DOMAIN="$(railway domain 2>/dev/null | grep -oE 'https://[A-Za-z0-9.-]+' | head -1 || true)"
  DOMAIN="${DOMAIN%/}"
fi

if [ -n "$DOMAIN" ]; then
  echo
  info "Waiting for $DOMAIN/health (up to 5 minutes)..."
  i=0
  until curl -fsS --max-time 5 "$DOMAIN/health" >/tmp/rebourn-health.$$ 2>/dev/null; do
    i=$((i+1))
    if [ "$i" -ge 60 ]; then
      warn "Still not healthy after 5 minutes. Check 'railway logs'."
      break
    fi
    sleep 5
  done
  if [ -s /tmp/rebourn-health.$$ ]; then ok "Healthy: $(cat /tmp/rebourn-health.$$)"; fi
  rm -f /tmp/rebourn-health.$$
fi

# --- 5. Summary ---------------------------------------------------------------
echo
bold "Done"
if [ -n "$DOMAIN" ]; then
  info "MCP endpoint:      $DOMAIN/mcp"
  info "Health:            $DOMAIN/health"
  echo
  info "Connect it:"
  info "  claude.ai   Settings > Connectors > Add custom connector > $DOMAIN/mcp"
  info "  Claude Code claude mcp add --transport http vault $DOMAIN/mcp"
  info "Then sign in with the Relay.md account that owns the vault (Google/GitHub/Microsoft button)."
fi
if [ "$NEW_SECRETS" = 1 ]; then
  echo
  warn "Save these in a password manager now; they are not shown again:"
  info "  STATIC_MCP_BEARER = $STATIC_MCP_BEARER   (for scripts that skip OAuth; keep private)"
  info "  JWT_SECRET is set on Railway only (rotate with: railway variables --set JWT_SECRET=...)"
fi
echo
