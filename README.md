# Rebourn OS

Skills, plugins and an MCP server from [Rebourn.ai](https://rebourn.ai) for building an AI-powered second brain and delivering AI consulting work with Claude.

## What is in here

| Path | What it is | Version |
|------|-----------|---------|
| `plugins/second-brain-obsidian` | Vault skills (`os-setup`, `os-optimizer`, `os-operator`, `os-mcp`, `team-os`) and client delivery skills (`client-onboarding`, `ai-opportunity-assessment`, `client-report`, `engagement-tracker`) | 2.0.2 |
| `plugins/rebourn-cloud-os-builder` | Builds the same second-brain structure in a synced cloud folder (Google Drive, OneDrive, iCloud, Dropbox) | 1.0.0 |
| `mcp/rebourn-vault-mcp` | MCP server giving Claude read and write access to an Obsidian vault through Relay.md, deployable to Railway | 2.1.0 |

## Install the plugins

In Claude Code or Claude desktop, add this repository as a plugin marketplace, then install a plugin from it:

```
/plugin marketplace add Rebournai/rebourn-os
/plugin install second-brain-obsidian@rebourn-os
```

## Run the MCP server

See [`mcp/rebourn-vault-mcp/README.md`](mcp/rebourn-vault-mcp/README.md) and `AUTH.md` for deployment. Copy `.env.example` to `.env` and fill in your own values. Never commit `.env`.

## Updating

Each plugin lists its version in `.claude-plugin/marketplace.json` and its own `CHANGELOG.md`. Update by pulling the marketplace and reinstalling the plugin.

## License

See [LICENSE](LICENSE). Third-party components keep their own licenses.
