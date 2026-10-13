---
name: ai-opportunity-assessment
version: 1.0.0
description: Assess a company's workflows and produce a prioritized, defensible list of what Claude can realistically automate — scored by hours saved, feasibility, and risk, then sorted into quick wins, projects, and not-yet. Use this whenever the user asks what a client could automate, wants an AI readiness or opportunity assessment, asks "where should they start with AI", needs to justify an engagement, is preparing a proposal or roadmap, or mentions scoring or prioritizing automation candidates. This is the core billable deliverable — reach for it even when the user only vaguely asks "what can we do for this client".
---

# AI Opportunity Assessment

Turn a picture of how a company works into a ranked, costed list of what to automate first — with the reasoning visible enough that a sceptical client can argue with it.

The output is a client-facing recommendation, so every number in it must be traceable to something the client said or confirmed. Assessments that invent numbers get caught, and the engagement does not survive it.

## Inputs

Read `Clients/{client}/Current-State.md` if it exists — `client-onboarding` produces it in the format this skill expects. Also read `Engagement.md` for scope and `Access-Policy.md` for data constraints.

If no baseline exists, run the Phase 2 current-state interview from `client-onboarding` first. Do not assess from assumptions.

Before scoring, confirm the workflow list back to the client and get missing numbers filled in. A workflow missing frequency or duration cannot be scored — chase it or mark it `UNSCORED` and exclude it from the ranking rather than guessing.

## Step 1 — Build the workflow inventory

List every recurring workflow from the baseline. For each, you need four fields:

| Field | Meaning |
|---|---|
| Who | Role(s) performing it |
| Frequency | Times per month |
| Duration | Hours per instance, per person |
| Inputs → Outputs | What goes in, what comes out |

Compute **annual hours** = frequency × duration × people × 12. This is the only impact number used. Do not convert to money unless the client gave you a loaded hourly rate — if they did, show both.

Discard nothing at this stage. Low-value workflows still get scored; the client seeing a low score is part of the credibility.

## Step 2 — Score each workflow

Three independent axes. Score them separately and never collapse them into one composite number — a single score hides the reasoning and invites disagreement about the wrong thing.

**Feasibility (1–5)** — how well current models actually do this work:

- **5** — Text in, text out, with clear examples of good output. Drafting, summarizing, reformatting, extracting, classifying, translating, first-pass review.
- **4** — As above but needs context the vault or a connector can supply.
- **3** — Needs a system integration that exists but must be built, or output that a human must check every time.
- **2** — Depends on tacit knowledge nobody has written down, or on tools with no API.
- **1** — Requires physical presence, real-time negotiation, legal or clinical accountability, or a judgment the client would not delegate to a person new to the role.

Score honestly. A 5 that is actually a 3 is how consultancies lose renewals.

**Risk (Low / Medium / High)** — what happens when it goes wrong:

- **Low** — errors are visible and cheap; a human reviews before anything leaves the building.
- **Medium** — errors reach a customer or a decision, but are recoverable; or the workflow touches personal data.
- **High** — regulated data, legal or financial exposure, safety implications, or output that cannot be reviewed before it acts.

Cross-check every High against `Access-Policy.md`. If the data involved is one the client fenced off, say so explicitly in the finding.

**Readiness** — a note, not a score: is the input data actually available and clean enough? Many good candidates fail here, and it is better surfaced now than in month three.

## Step 3 — Sort into tiers

Place each workflow by feasibility against annual hours, then apply risk as a modifier.

- **Quick wins** — feasibility 4–5, risk Low, meaningful hours. Deliverable within the current engagement. Aim to name three to five; more than that reads as unfocused.
- **Projects** — high hours but feasibility 3, or feasibility 4–5 with Medium risk needing controls built. These are the follow-on engagement. Estimate effort in days.
- **Not yet** — feasibility 1–2, or High risk without a control that exists today. Include these deliberately: showing what you are *not* recommending is the strongest trust signal in the document, and it pre-empts the client asking about it later.

Never let the tiering be purely mechanical. If the arithmetic ranks something first that you would not actually start with, say so and explain why — sequencing, political sensitivity, or a dependency. Write the reason down.

## Step 4 — Detail the top candidates

For the top three quick wins only, write an implementation sketch:

- What the automation does, in one sentence the client would repeat accurately to a colleague
- Which Claude surface delivers it (a skill, a project, a scheduled task, a connector)
- What has to exist first (data, access, a connector, a decision)
- How output gets reviewed, and by whom
- What "working" looks like — a measurable check, agreed with the client
- Rough effort in days

Keep sketches short. Depth here is a sales signal, but over-specifying before the client has committed wastes the work if they pick differently.

## Step 5 — Write it up

Save findings to `Clients/{client}/Findings/assessment-{date}.md`.

Structure:

1. **What we looked at** — teams, workflows counted, how the picture was gathered, over what period.
2. **Headline** — total annual hours across scored workflows, hours in the quick-win tier, and the single highest-value starting point. Three sentences maximum.
3. **The ranked table** — every scored workflow with hours, feasibility, risk, and tier.
4. **Top three, detailed** — the sketches from Step 4.
5. **Not yet, and why** — with the reasoning.
6. **What we could not score** — unknowns and who owns chasing them.
7. **Recommended sequence** — what to do in the first 30 days, and what that unlocks.

Then hand off to `client-report` to produce the client-facing version. Do not send the raw findings file to a client; it is working material.

## Rules

- Every hours figure traces to a client-stated frequency and duration. If you estimated, label it `ESTIMATE — unconfirmed` inline.
- Never present a total-savings number without stating the assumptions under it in the same sentence.
- Do not recommend a tool or connector the client cannot buy, administer, or legally use given `Access-Policy.md`.
- Resist inflating feasibility to make the deliverable look better. The assessment's value is that it is honest enough to act on.
- If the honest answer is that a client has little worth automating, say that, and say what would need to change. That answer is worth more than a padded list, and clients remember it.
