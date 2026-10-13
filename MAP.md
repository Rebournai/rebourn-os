# Map: what is where

Every skill exists once, in one folder. The three installable packages are recipes in
[`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) that point at those folders.

## Folder tree

```
rebourn-os/
├── os/                                  THE OS: skills that set up and run the vault
│   ├── CHANGELOG.md
│   └── skills/
│       ├── os-setup/                    builds the vault structure and runs onboarding
│       ├── os-optimizer/                audits and optimizes a vault
│       ├── os-operator/                 builds and schedules the recurring Operator prompt
│       ├── os-mcp/                      deploys the Relay MCP server (source bundled inside)
│       └── team-os/                     shared vault setup (bundled Relay fork inside)
├── skills/                              STANDALONE SKILLS: download any folder on its own
│   ├── client-onboarding/
│   ├── ai-opportunity-assessment/
│   ├── client-report/
│   ├── engagement-tracker/
│   └── rebourn-prompt-master/
├── .claude-plugin/marketplace.json      defines the three installable packages
├── MAP.md  README.md  CHANGELOG.md  LICENSE
```

## Skills: folder, path, and which package includes it

| Skill | Group | Path | In `second-brain-obsidian` (full) | In `second-brain-obsidian-os` | In `rebourn-prompt-master` |
|-------|-------|------|:---:|:---:|:---:|
| os-setup | OS | `os/skills/os-setup` | yes | yes | |
| os-optimizer | OS | `os/skills/os-optimizer` | yes | yes | |
| os-operator | OS | `os/skills/os-operator` | yes | yes | |
| os-mcp | OS | `os/skills/os-mcp` | yes | yes | |
| team-os | OS | `os/skills/team-os` | yes | yes | |
| client-onboarding | Skill | `skills/client-onboarding` | yes | | |
| ai-opportunity-assessment | Skill | `skills/ai-opportunity-assessment` | yes | | |
| client-report | Skill | `skills/client-report` | yes | | |
| engagement-tracker | Skill | `skills/engagement-tracker` | yes | | |
| rebourn-prompt-master | Skill | `skills/rebourn-prompt-master` | | | yes |

## Packages

| Package | Version | Contains | Install |
|---------|---------|----------|---------|
| `second-brain-obsidian` | 2.0.2 | 5 OS skills + 4 client skills | `/plugin install second-brain-obsidian --marketplace Rebournai/rebourn-os` |
| `second-brain-obsidian-os` | 1.0.0 | 5 OS skills | `/plugin install second-brain-obsidian-os --marketplace Rebournai/rebourn-os` |
| `rebourn-prompt-master` | 1.0.0 | Prompt Master | `/plugin install rebourn-prompt-master --marketplace Rebournai/rebourn-os` |

Install either Second Brain edition, not both: they share skill names.

## Download one skill by itself

Each folder under `skills/` and `os/skills/` is self-contained: `SKILL.md`, its `references/`, and a `LICENSE`.

```
npx degit Rebournai/rebourn-os/skills/client-report client-report
```

Replace the path with any skill folder above. Then place the folder in your Claude skills directory.

## Third-party components

| Where | What | License |
|-------|------|---------|
| `os/skills/team-os/reference/rebourn-relay-fork/` | Compiled fork of the Relay Obsidian plugin | MIT; notices in `LICENSE` and `THIRD-PARTY-NOTICES.md` |
| `os/skills/os-mcp/reference/relay-mcp-server/` | Rebourn.ai's Relay MCP server source (depends on the MCP SDK and Relay.md's hosted service) | Repository license |
