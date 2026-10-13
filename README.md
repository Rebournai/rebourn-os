# Rebourn OS

Claude plugins from [Rebourn.ai](https://rebourn.ai) for building an AI-powered second brain and delivering AI consulting work.

## Plugins

| Plugin | What it is | Version |
|--------|-----------|---------|
| `second-brain-obsidian` | Full edition: vault skills (`os-setup`, `os-optimizer`, `os-operator`, `os-mcp`, `team-os`) plus client delivery skills (`client-onboarding`, `ai-opportunity-assessment`, `client-report`, `engagement-tracker`) | 2.0.2 |
| `second-brain-obsidian-os` | OS-only edition: the five vault skills, without the client delivery skills | 1.0.0 |
| `rebourn-prompt-master` | Interviews you, then writes, rewrites or audits prompts and instruction files for the Claude 5 models | 1.0.0 |

Install either Second Brain edition, not both: they share skill names.

## Install

Add this repository as a plugin marketplace, then install a plugin from it:

```
/plugin marketplace add Rebournai/rebourn-os
/plugin install second-brain-obsidian@rebourn-os
```

Swap in `second-brain-obsidian-os` or `rebourn-prompt-master` for the plugin you want.

## Updating

Each plugin's version is listed in `.claude-plugin/marketplace.json` and in its own `CHANGELOG.md`. Update by refreshing the marketplace and reinstalling the plugin.

## License

See [LICENSE](LICENSE). Third-party components keep their own licenses.
