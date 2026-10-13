---
name: client-report
version: 1.0.0
description: Turn working notes and assessment findings into a polished, branded client-facing deliverable — assessment reports, progress updates, and engagement wrap-ups — as a shareable web page or document. Use this whenever the user needs something to actually send a client: a report, a readout, a status update, a summary of findings, a deck-alternative, an end-of-engagement summary, or says "write this up for the client", "make this presentable", or "what do we send them". Also use it after ai-opportunity-assessment, which produces working material that is not itself client-ready.
---

# Client Report

Convert internal working material into something a client will read, trust, and forward to their boss.

The gap this closes is real: findings files are written for you, full of shorthand, unknowns, and hedges. A client deliverable has a different job — it must be skimmable in two minutes by someone who was not on the calls, and survive being forwarded without you there to explain it.

## Step 1 — Establish the type

| Type | When | Core question it answers |
|---|---|---|
| **Assessment report** | After `ai-opportunity-assessment` | "What should we do, and why that first?" |
| **Progress update** | Mid-engagement, on a cadence | "What moved, what's blocked, what do you need from us?" |
| **Wrap-up** | End of engagement | "What did we get, and what happens now?" |
| **Proposal** | Pre-engagement | "What are you buying, and what does good look like?" |

Ask which if it is not obvious from context. Each has a different shape — do not use one template for all four.

## Step 2 — Load brand and audience

Read `Config/brand.md` from the consultancy vault if it exists (business name, colours, logo path, sign-off, tone). If it does not exist, ask once for business name and accent colour, then create it so the next report does not re-ask.

Then establish the audience, because it changes the writing more than anything else:

- **Operator** (the person whose team is affected) — wants specifics, mechanics, what changes on Monday.
- **Executive** (signs the cheque) — wants outcome, cost, risk, and the decision being asked of them. Everything else is appendix.
- **Both** — lead with the executive layer, push mechanics into clearly-marked detail sections.

Assume "both" unless told otherwise.

## Step 3 — Draft

Read the source material from `Clients/{client}/Findings/` and `Clients/{client}/Engagement.md`.

Universal rules, whichever type:

**Open with the answer.** The first paragraph states the conclusion and the recommended decision. Never open with methodology, never open with a summary of what the client already told you. If the reader stops after paragraph one, they should still know what you think they should do.

**Every number carries its assumption.** "Roughly 340 hours a year, based on the 15 proposals a month and 2 hours each your team described" — not "340 hours a year". Naked numbers get challenged; sourced numbers get discussed.

**Preserve the unknowns.** Anything marked `UNKNOWN` or `ESTIMATE` in the findings stays visible in the deliverable, in its own short section. Hiding gaps to look confident is how a deliverable becomes a liability in month two.

**Keep the not-recommended list.** Clients trust a document that declines things. Say what you looked at and are not proposing, with one line of reasoning each.

**Cut hedging.** Working notes hedge because you were still thinking. The deliverable takes a position. If you genuinely cannot take one, name the specific thing that would settle it.

**No internal shorthand.** Strip scoring mechanics, internal names, and anything about your own process or margins. The client sees conclusions and reasoning, not your instrumentation. Feasibility scores are internal — translate them into plain statements about what is straightforward and what is not.

## Step 4 — Build it

Default to a **self-contained HTML page published as an Artifact** — it is skimmable, works on a phone, and the client can forward a link without a 4MB attachment. Load the `artifact-design` skill before writing it.

Produce a `.docx` instead when the client's process needs a file (procurement, legal review, or they asked for one). Load the `docx` skill for that path.

Layout that works, in order: headline conclusion → the recommendation and what it costs → supporting detail → what we are not recommending → open questions → next steps with named owners and dates.

Keep an assessment report under roughly six screens. Length reads as padding, not rigour.

Save deliverables to `Clients/{client}/Deliverables/{type}-{date}.{ext}`.

## Step 5 — Check before it leaves

Verify explicitly, and report the result:

- Every figure traces to source material — no number appears that is not in the findings
- No internal-only content survived: margins, day rates you did not agree to share, notes about client personalities, scoring mechanics
- `Access-Policy.md` respected — nothing quoted that the recipient is not cleared to see, which matters when the report goes to a mixed internal/contractor audience
- Names, job titles, and the company name are spelled correctly
- Every next step has an owner and a date

Then hand the file to the user. **Never send it to the client yourself** — the user reviews and sends. Say plainly that it is ready to review, not that it has been delivered.

## Rules

- Never invent a finding to fill a section. A short report with four real findings beats a long one padded to eight.
- Never soften a risk to make the deliverable more sellable. The risk section is what protects you when something goes wrong.
- Keep the client's own vocabulary — if they call them "matters" and not "projects", the report says matters.
- If the source findings are thin, say so to the user before writing rather than compensating with prose.
