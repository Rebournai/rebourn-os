---
name: client-onboarding
version: 1.0.0
description: Run a structured intake for a new consulting client and stand up their vault — captures the engagement basics, their current tools and workflows, their access and governance boundaries, then builds the client workspace and writes a baseline "how you work today" document. Use this whenever the user mentions a new client, a kickoff, an intake or discovery call, onboarding a company, "we just signed X", "set up a new client", or starting an engagement — even if they don't say the word "onboarding". Always use this before ai-opportunity-assessment; the assessment reads what this produces.
---

# Client Onboarding

Turn a signed client into a working vault and a documented baseline, in one guided session.

This is the first billable session of an engagement, productized. It produces three artifacts the rest of the engagement depends on:

| File | What it holds |
|---|---|
| `Clients/{client}/Engagement.md` | Scope, dates, contacts, commercials, success criteria |
| `Clients/{client}/Current-State.md` | Their tools, workflows, and pain points as they described them |
| `Clients/{client}/Access-Policy.md` | Who sees what; what Claude may and may not touch |

## Before starting

Run from the consultancy vault root (the folder containing `Clients/`). If `Clients/` does not exist, create it.

Check whether `Clients/{client}/` already exists:
- **Exists** — ask whether to resume the intake, revise the existing baseline, or start over. Never silently overwrite a baseline; it is engagement evidence.
- **Does not exist** — proceed.

Ask for the client name first and slugify it for the folder (`Acme Health` → `Clients/acme-health/`). Use that slug consistently everywhere.

## Phase 1 — Engagement basics

Ask these together using AskUserQuestion where the answers are bounded, plain questions where they are not. Do not interrogate one field at a time.

- Company name, industry, rough headcount
- Primary contact (name, role, email) and the economic buyer if different
- Engagement type: assessment only / assessment + build / ongoing retainer
- Start date and expected duration
- Commercials: fixed fee, day rate, or retainer — and the number
- What "success" looks like in the client's own words

Write `Engagement.md` immediately after this phase, before continuing. If the session is interrupted, this file must already exist.

## Phase 2 — Current state interview

The goal is a truthful picture of how work happens today, in the client's vocabulary. Capture their words, not your paraphrase — the assessment skill depends on this fidelity.

Cover, in this order:

**Tools.** What they use daily and what each is used for. Probe specifically for: email/calendar, chat, docs and file storage, CRM, project/ticket tracking, finance/billing, and anything industry-specific. Note which are paid, who administers them, and any that are being replaced.

**Workflows.** For each team or role, ask what they actually do in a week. Push for concrete recurring work — "we write ~15 proposals a month", "someone spends every Monday morning reconciling two spreadsheets". For each recurring workflow captured, record: who does it, how often, roughly how long it takes, and what the inputs and outputs are. These four fields are what the assessment scores; a workflow logged without them is not usable.

**Pain points.** What is slow, repetitive, error-prone, or hated. Ask directly: "if you could delete one recurring task from your team's week, what would it be?"

**Prior AI use.** What they have already tried, what worked, what burned them. Existing accounts and licences. This matters — a client with a failed rollout behind them needs a different sequencing than a greenfield one.

**Data sensitivity.** What categories of data exist (customer PII, health, financial, legal privilege, trade secrets) and where they live. Note any regulatory regime they named. Do not go deeper than what they volunteer at this stage.

Write `Current-State.md` at the end of this phase. Structure it by team, then by workflow, with the four required fields visible per workflow so the assessment can read them mechanically.

## Phase 3 — Access and governance

This is the phase that gets skipped and later causes problems. Do not skip it.

Establish:

- **Who is internal and who is outsourced.** List named people or at least named roles. Contractors, agencies, and fractional staff all count as outsourced.
- **What outsourced people must not see.** Usually: strategy, financials, client lists, staff matters. Get this stated explicitly rather than assumed.
- **What Claude must not touch.** Translate the answer into concrete `.claudeignore` patterns and record them.
- **Who owns the accounts.** The client owns their own Relay, Railway, and any other service account. Confirm this out loud — it is easier agreed at kickoff than renegotiated later. Record the owning email address.
- **Offboarding trigger.** What ends access, and who is responsible for revoking it.

Write `Access-Policy.md` from these answers. It is a client-facing document — write it in plain language they could hand to their own security reviewer.

## Phase 4 — Stand up the workspace

Two vaults are in play. Be explicit about which you are building.

**Their vault** (the client's own second brain): invoke the `os-setup` skill from inside the client's vault folder, in Business/Teams mode. Do not reimplement setup here — `os-setup` owns that. Pass through what Phase 2 captured so the interview does not re-ask questions the client has already answered.

**Your client folder** (inside the consultancy vault): the three files above, plus an empty `Findings/` for assessment output and `Deliverables/` for anything sent to the client.

If the client needs shared editing, follow the Relay setup in the onboarding handbook — client creates the account and the relay, sends the Share Key, you join as a member. Never create the account for them. Never put two clients in one relay.

Apply the `.claudeignore` patterns from Phase 3 to the client's vault before any content lands in it.

## Phase 5 — Close the loop

Register the client with the `engagement-tracker` skill at stage `active`.

Then report back to the user — not the client — covering: what was created and where, anything the client could not answer that needs chasing, and the two or three workflows that already look like obvious automation candidates. Flag the last as impressions only; scoring them is the assessment's job.

Offer the assessment as the next step.

## Rules

- Never fabricate an answer the client did not give. An unknown is recorded as `UNKNOWN — ask {contact}`, and unknowns are surfaced in the Phase 5 report.
- Never write client data into the consultancy vault's shared or synced folders without checking Phase 3's access policy first.
- Keep `Current-State.md` descriptive, never prescriptive. Recommendations belong in the assessment, and mixing them here makes the baseline useless as a before-picture.
- If the user is running this live on a call with the client, keep questions conversational and batch them; do not read the phase structure aloud.
