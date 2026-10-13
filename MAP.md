# Map: what is where

Every skill exists once, in one folder. Each folder is self-contained (`SKILL.md`, its `references/`, and a `LICENSE`), so it can be downloaded on its own.

## Folder tree

```
rebourn-os/
├── os/skills/                           skills for running an Obsidian vault
│   ├── os-optimizer/
│   ├── os-operator/
│   ├── os-mcp/                          deploys the Relay MCP server (source bundled inside)
│   └── team-os/                         shared vault setup (bundled Relay fork inside)
├── skills/                              standalone skills
│   ├── client-onboarding/
│   ├── ai-opportunity-assessment/
│   ├── client-report/
│   ├── engagement-tracker/
│   ├── email-triage/
│   └── rebourn-prompt-master/
├── .claude-plugin/marketplace.json      defines the installable package(s)
├── MAP.md  README.md  CHANGELOG.md  LICENSE
```

## Skills

| Skill | Path | Installable package |
|-------|------|---------------------|
| os-optimizer | `os/skills/os-optimizer` | none (download the folder) |
| os-operator | `os/skills/os-operator` | none (download the folder) |
| os-mcp | `os/skills/os-mcp` | none (download the folder) |
| team-os | `os/skills/team-os` | none (download the folder) |
| client-onboarding | `skills/client-onboarding` | none (download the folder) |
| ai-opportunity-assessment | `skills/ai-opportunity-assessment` | none (download the folder) |
| client-report | `skills/client-report` | none (download the folder) |
| engagement-tracker | `skills/engagement-tracker` | none (download the folder) |
| email-triage | `skills/email-triage` | none (download the folder) |
| rebourn-prompt-master | `skills/rebourn-prompt-master` | `rebourn-prompt-master` 1.0.0 |

## Install a package

```
/plugin marketplace add Rebournai/rebourn-os
/plugin install rebourn-prompt-master --marketplace Rebournai/rebourn-os
```

## Download one skill by itself

```
npx degit Rebournai/rebourn-os/skills/client-report client-report
```

Replace the path with any skill folder above, then place the folder in your Claude skills directory.

## Third-party components

| Where | What | License |
|-------|------|---------|
| `os/skills/team-os/reference/rebourn-relay-fork/` | Compiled fork of the Relay Obsidian plugin | MIT; notices in `LICENSE` and `THIRD-PARTY-NOTICES.md` |
| `skills/email-triage/` | Rebourn.ai skill released under its own license | MIT; see `skills/email-triage/LICENSE` |
| `os/skills/os-mcp/reference/relay-mcp-server/` | Relay MCP server source (depends on the MCP SDK and Relay.md's hosted service) | Repository license |
