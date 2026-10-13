# Profile file formats

Write these into `Email-Triage/<profile-slug>/` (or the location agreed in the interview). In an Obsidian vault use wikilinks for notes the vault already has, and follow the vault's own conventions where they exist.

## Profile.md

```markdown
---
type: email-triage-profile
profile: <slug>
segment: ecommerce | small-business | personal
updated: YYYY-MM-DD
---

## Scope
- Platform(s): Gmail | Outlook | helpdesk:<name> | pasted
- Mailbox / account: <address or account name>
- Default window: <e.g. unread, last 24h>
- Batch size: <N threads>
- Off-limits: <labels, senders, accounts>

## Autonomy
- Level: read-only | draft-only | organize | custom
- Auto-archive / auto-label allowed for: <categories or none>
- Never touch: <VIP senders, labels>
- Custom per-category permissions: <if any>

## Sensitive data
- Policy: flag-only | draft-with-approval | draft-normally for <named categories>
- Sensitive categories for this user: <list>

## Outputs
- Digest destination: vault daily note | Digests/ file | chat only
- Task destination: <path and format> | chat only
- Mailbox label scheme: <names>

## Learning
- Save corrections as rules: automatically | ask first | off
- Learn voice from sent mail: yes (N samples) | no

## Store and tool lookups (e-commerce / SMB)
- Connected: <Shopify read-only | CRM | calendar | none>
- Writes allowed: none

## Defaults (not confirmed by the user)
- <list anything you assumed so it can be revisited>
```

## Categories.md

```markdown
---
type: email-triage-categories
profile: <slug>
updated: YYYY-MM-DD
---

| Category | Priority | Action | Notes |
|---|---|---|---|
| Order status | High | Draft | Needs tracking lookup |
| ... | ... | ... | ... |

## Policies drafts must respect
- <return window, shipping times, goodwill limits, response time promises, etc.>
```

## Rules.md

```markdown
---
type: email-triage-rules
profile: <slug>
updated: YYYY-MM-DD
---

Specific rules override categories. Newest first.

- 2026-01-15: Sender `@carrier.example` about delays: High, category Shipping delay. Source: user correction.
- 2026-01-15: Subject contains "wholesale": High, never auto-archive.
```

## Voice.md

```markdown
---
type: email-triage-voice
profile: <slug>
updated: YYYY-MM-DD
---

## Tone
<2-4 lines: warmth, formality, length, humor, do and don't>

## Sign-off and name
<greeting, closing, name or team to sign with>

## Languages
<languages and when to switch>

## Examples (user approved)
1. <short example reply>
2. <short example reply>
```
