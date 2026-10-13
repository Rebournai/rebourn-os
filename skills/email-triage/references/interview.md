# Setup interview

Ask in batches of 3-4. Offer choices, accept free text. Propose a default whenever the user is unsure and record it as a default. Skip any question already answered by the conversation, the vault, or an existing profile.

## Interview mechanics

- **Quick vs full setup.** Offer both at the start. Quick setup asks only the safety-critical items (platform, scope, autonomy, sensitive-data policy, voice source, digest destination) and applies the segment defaults from `categories.md` for everything else, marking them as defaults. Full setup runs every batch below. Quick setup keeps the interview to 3-4 batches and can be refined later through corrections.
- **Reconcile conflicts before moving on.** Answers can contradict each other, for example draft-only autonomy with a request to label or archive. When that happens, say so, explain the difference in one sentence, and offer a concrete resolution (usually a custom level that grants the narrower permission, such as label but not archive). Never silently pick one.
- **Empty or half answers.** If someone picks "Other" without typing a value, ask once in plain text. If it is still missing, record it as `TBD` in the profile, list it under Defaults, and keep going.
- **Typed answers are expected for policies.** Return windows, shipping times, goodwill limits, VIP names, label names, file paths and similar values need real text. Tell the user up front that multiple-choice options are common defaults and they can type exact values.
- **Never invent policies.** If a policy is unknown, leave drafts to use placeholders or non-committal wording.

## Contents
1. Common questions (everyone)
2. E-commerce branch
3. Small business branch
4. Personal branch
5. Closing: confirm, write, schedule

## 1. Common questions

**Batch A: scope**
- Who is this mailbox for? Pick a profile name (slug) and the segment: e-commerce, small business, personal.
- Which platform(s)? Gmail, Outlook/Microsoft 365, a helpdesk (Gorgias, Zendesk, Help Scout, Front, other), or pasted/exported emails. Check which connectors are actually available and say so.
- Which mailbox, address or shared inbox is in scope? Anything off-limits (other accounts, personal folders)?
- Default time window and batch size per run (for example, unread from the last 24 hours, up to 50 threads).

**Batch B: actions and autonomy**
- What should triage do: classify and prioritize, draft replies, label/archive, daily digest, extract tasks. (Multi-select.)
- Autonomy level: read-only, draft-only, organize, or custom per category. Recommend draft-only to start, with organize added later once trust is built.
- Which categories, if any, may be auto-archived or auto-labeled without asking?
- Hard stops: anything that should never be touched (VIP senders, legal, a specific label).

**Batch C: voice and sensitivity**
- Reply voice: learn from sent mail if available (ask consent and the number of samples), otherwise describe the tone and give 2-3 example replies. Sign-off, name to sign with, language(s).
- Sensitive emails (legal, medical, financial, HR, customer personal data): flag only, draft only with approval, or draft normally? Decide per user, and ask which categories count as sensitive for them.
- Do they want the skill to save corrections as rules automatically, or ask first?

**Batch D: outputs**
- Where should the digest go: the vault daily note, a digest file, or chat only?
- Where should extracted tasks go: a vault task list (ask path and format), another tool, or chat only?
- Preferred priority labels and label names in the mailbox, if they already have a scheme.

## 2. E-commerce branch

Ask after the common batches. These shape categories, drafts and lookups.

**Store and stack**
- Store platform: Shopify, WooCommerce, BigCommerce, Wix, Amazon seller, other.
- Support inbox type: personal Gmail, shared support@ address, or a helpdesk. Who else answers?
- Should drafts include live order data? If a store connector is available (read-only), which fields: status, tracking, items, refund state? Confirm writes to the store stay off.

**Policies the drafts must respect** (never invent these; capture them)
- Shipping times and carriers, tracking process, international and customs notes.
- Return and refund window, conditions, who pays return shipping, exchange policy.
- Damaged, wrong or missing item process, and what evidence is needed (photos).
- Discounts and goodwill: what a reply may offer without approval, and the limits.
- Business hours and expected response time to promise customers.

**Email types** (which matter, which are noise): order status (WISMO), shipping delays, returns/refunds/exchanges, damaged or wrong item, cancellations and address changes, product questions and pre-sale, discount code issues, payment problems, chargebacks and disputes, fraud alerts, wholesale and B2B, influencer and affiliate requests, supplier and 3PL messages, marketplace notifications, reviews and review requests, app and platform notices (Shopify, Klaviyo, payment processor), cold sales pitches.

**Priorities**
- What is truly urgent (chargeback deadlines, payment failures, fulfillment stoppages, fraud, angry repeat contacts)?
- Any VIP customers, wholesale partners or suppliers who always jump the queue?
- Peak seasons or active promotions where volume or urgency changes?

**Edge handling**
- Duplicate or repeat contacts about the same order: merge into one item?
- Abusive or threatening customers, legal threats, press: escalate to whom?
- Languages other than English?

## 3. Small business branch

**Business basics**
- What does the business do and who are the customers? Team size and who handles what in the inbox.
- Is this a shared inbox? Who should be tagged or delegated for sales, billing, delivery?

**Email types**: new leads and inquiries, quote and proposal requests, client project messages, scheduling and meeting requests, invoices to send, invoices received, payment reminders, vendor and supplier mail, hiring and applications, partnership and referral requests, contracts and legal, tax/accounting, tool and subscription notices, cold outreach, newsletters.

**Priorities and policies**
- Lead response time target, and what counts as a hot lead (budget, deadline, referral).
- Which clients or vendors are VIP?
- Pricing and availability: may drafts quote prices or dates, or only propose a call? Booking link to include?
- Billing: how to treat overdue invoices and payment disputes.
- What should be escalated to the owner and what can be delegated?

**Connections**: calendar for scheduling replies, CRM or pipeline tool for leads (read-only vs create entries), accounting tool.

## 4. Personal branch

**Life context**
- What fills the inbox: bills, banking, travel, family and friends, school or work, shopping, newsletters, social notifications, government/tax, health portals.
- How aggressive on cleanup: only label, or archive promos and newsletters, or propose unsubscribes (never do it automatically)?

**Priorities**
- Which senders or people always matter? Which topics have deadlines (bills, appointments, renewals, travel)?
- Quiet hours or how often they want a digest.

**Sensitivity**
- Banking, medical, tax, identity and legal emails: flag only is strongly recommended. Ask for explicit direction on each.
- Voice for personal replies differs by recipient (family vs formal). Capture 2-3 examples.

## 5. Closing

1. Show a one-screen summary: segment, platforms, scope, autonomy, categories with priorities, voice, sensitive policy, outputs, learning mode. Mark defaults.
2. Ask for corrections, then write `Profile.md`, `Categories.md`, `Rules.md` (empty or seeded), and `Voice.md` per `config-template.md`.
3. Offer a dry run: triage a small batch (10 threads) in read-only mode first so the user can correct categories before anything is drafted or labeled. Capture those corrections as rules.
4. Offer scheduled runs (see SKILL.md, Scheduling).
