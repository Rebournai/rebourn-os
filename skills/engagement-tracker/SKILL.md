---
name: engagement-tracker
version: 1.0.0
description: Track consulting clients and prospects across their whole lifecycle — pipeline stages, scope, status, what is stalled, what needs invoicing, and what is due. Use this whenever the user asks about their clients, pipeline, prospects, deals, workload, revenue, "who owes us", "what's the status of X", "what needs attention", "did we invoice Y", or wants a weekly review across clients. Also use it to log a new lead or move a client between stages. Reach for it any time the question spans more than one client rather than sitting inside a single engagement.
---

# Engagement Tracker

Keep an honest, current picture of every client and prospect across a two-person consultancy.

The failure mode this prevents is specific: work gets done, nobody invoices it, and a prospect who asked for a proposal in March gets remembered in June. A tracker only works if it is trusted, and it is only trusted if it is current — so bias toward updating it whenever client status comes up in conversation, not only when asked.

## Where state lives

One file per client at `Clients/{slug}/Engagement.md`, carrying YAML frontmatter that this skill reads and writes:

```yaml
client: Acme Health
stage: active          # lead | qualified | proposal | active | wrap-up | closed | lost
owner: Alex           # who runs this relationship
value: 12000           # currency units, total or monthly for retainers
model: fixed           # fixed | day-rate | retainer
started: 2026-08-01
next_action: Send assessment report
next_action_due: 2026-09-04
last_contact: 2026-08-26
invoiced_through: 2026-07-31
```

Never keep a second copy of this data in a separate index file. Derive views on read — a duplicated pipeline file drifts within two weeks and then actively misleads.

## Stages

| Stage | Means | Exit |
|---|---|---|
| `lead` | Name and a reason to talk | A qualifying conversation happened |
| `qualified` | Real need, budget plausible, right contact | Proposal sent |
| `proposal` | Awaiting a decision | Signed, or lost |
| `active` | Work in progress | Delivery complete |
| `wrap-up` | Delivered, invoicing or renewal open | Paid and decided |
| `closed` | Finished cleanly | — |
| `lost` | Did not proceed — record why | — |

Always record a reason on `lost`. Across a year those reasons are the most useful data the consultancy has about its own positioning.

## Operations

**Log a lead.** Ask only for name, source, and the reason to talk. Create `Clients/{slug}/Engagement.md` with `stage: lead`. Do not run a full intake — that is `client-onboarding`, and it belongs after qualification, not before.

**Move a stage.** Update `stage`, set a new `next_action` and due date, and stamp `last_contact`. A stage change without a next action is the most common way a pipeline silently stalls — refuse to leave `next_action` empty, and if the user does not have one, set a follow-up date instead.

**Status of one client.** Read that client's folder and report stage, what is in flight, what is overdue, and what is unbilled.

**Weekly review.** The main event. Read every `Clients/*/Engagement.md` and produce:

- **Needs attention now** — overdue `next_action_due`, or `active` clients with `last_contact` more than 14 days ago
- **Stalled** — `proposal` stage for more than 21 days with no contact
- **Unbilled** — `active` or `wrap-up` where `invoiced_through` is more than 30 days old
- **This week** — actions due in the next 7 days, by owner
- **Pipeline value** — split by stage, with weighted total (`qualified` × 0.3, `proposal` × 0.6, `active` × 1.0)
- **Load check** — active engagements per owner, flagged if unevenly split

Lead with "needs attention" and "unbilled". Those two are why the review exists; pipeline value is context.

**Render a dashboard.** When the user wants to look at it rather than read it, build a self-contained HTML page and publish it as an Artifact so it survives the conversation — load `artifact-design` first, and `dataviz` if it includes charts. Republish to the same URL on later updates rather than creating a second one.

## Conventions

- Currency: whatever the user first used. Do not convert between currencies silently.
- Retainers: `value` is the monthly figure and `model: retainer`. Never annualize into `value` — it corrupts the weighted pipeline total.
- Dates: `YYYY-MM-DD`, always. Resolve "next Tuesday" to a real date before writing it.
- Every client has exactly one owner.

## Rules

- Update frontmatter whenever the conversation reveals a change — a mentioned call updates `last_contact`, a sent proposal moves the stage. Do this without being asked; a tracker updated only on request is always stale.
- Never invent a value, date, or stage. Unknown numeric fields are omitted rather than zeroed — a `0` reads as real data and skews the pipeline total.
- Report what the files say, including when that is uncomfortable. If four clients are overdue, lead with four overdue clients.
- When a client reaches `closed` or `lost`, keep the folder. Closed clients are the referral and case-study pipeline.
- If the numbers suggest the user is overcommitted, say so plainly rather than presenting a tidy list.
