# Rebourn OS

Skills from [Rebourn.ai](https://rebourn.ai) for building an AI-powered second brain and delivering AI consulting work with Claude.

See **[MAP.md](MAP.md)** for what is in each folder and which package contains it.

- `os/`: the OS skills that set up and run an Obsidian vault.
- `skills/`: standalone skills. Download any folder on its own.

## Install a package

```
/plugin marketplace add Rebournai/rebourn-os
/plugin install second-brain-obsidian --marketplace Rebournai/rebourn-os
/plugin install second-brain-obsidian-os --marketplace Rebournai/rebourn-os
/plugin install rebourn-prompt-master --marketplace Rebournai/rebourn-os
```

Install either Second Brain edition, not both.

## Updating

Versions are listed in `.claude-plugin/marketplace.json` and in `CHANGELOG.md`. Update by refreshing the marketplace and reinstalling the package.

## License

See [LICENSE](LICENSE). Third-party components keep their own licenses.
