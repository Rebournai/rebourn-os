# email-triage

A Claude skill that triages an inbox for e-commerce stores, small businesses and personal use.

On first use it interviews you and saves a profile (categories, priorities, reply voice, autonomy, sensitive-data policy) in your Obsidian vault or a plain markdown folder. After that it classifies and prioritizes emails, drafts replies for your review, labels mail, and writes a daily digest with extracted tasks. It learns from your corrections.

## What it does

- Interview that branches by segment: e-commerce, small business, personal
- Works with Gmail, Outlook / Microsoft 365, helpdesks (Gorgias, Zendesk, Help Scout, Front) or pasted emails
- Four autonomy levels: read-only, draft-only, organize, custom. It never sends email on its own.
- Optional read-only store lookups (order status, tracking) so drafts have real facts
- Strict handling of untrusted email content: no instruction-following from emails, phishing flags, sensitive-topic policy
- One profile per mailbox or client, kept separate
- Optional scheduled runs

## Install

Copy the `email-triage/` folder into your Claude skills directory, or package it as a `.skill` file and import it in Claude. Then say something like "triage my inbox" or "set up email triage for my store".

## Layout

```
SKILL.md                     workflow
references/interview.md      setup questions per segment
references/categories.md     default categories and priorities
references/safety.md         prompt-injection, privacy, sensitive-data rules
references/connectors.md     per-platform notes
references/config-template.md  profile file formats
evals/evals.json             test prompts
```

## Privacy

The skill stores nothing in this repository. Profiles, rules and digests are written to your own vault. Do not commit real mailbox content or client data.

## License

MIT, copyright Rebourn.ai. See `LICENSE`.
