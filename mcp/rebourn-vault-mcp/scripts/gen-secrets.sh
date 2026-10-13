#!/usr/bin/env bash
# Print fresh secrets for a Rebourn Vault MCP deployment.
# Usage: bash scripts/gen-secrets.sh
set -euo pipefail

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required (it ships with macOS and most Linux distributions)." >&2
  exit 1
fi

echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "STATIC_MCP_BEARER=$(openssl rand -hex 24)"
