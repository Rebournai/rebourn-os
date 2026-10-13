# Connectors and input methods

Connector tools change between environments. Check which tools are actually present (search the tool list or registry) before promising anything, and tell the user which input method will be used.

## Gmail
- Use a Gmail connector/MCP if present. Common operations: search with Gmail query syntax (`is:unread newer_than:1d`), read thread, create draft, apply label, archive.
- Some setups have multiple Gmail accounts. Use the account named in the profile only. If a request names a different account, stop and ask.
- Drafts: create in Gmail Drafts, threaded to the original message. Do not send.
- Labels: prefix with a namespace such as `Triage/Urgent`, `Triage/Order status` so they are easy to find and remove. Create labels only if the autonomy level allows it.

## Outlook / Microsoft 365
- Use the Microsoft 365 / Outlook connector if present. Operations are similar: list unread, read conversation, create draft reply, set category, move to folder.
- Outlook uses categories and folders instead of labels. Map priority to colored categories if the user wants a visible scheme.
- Shared mailboxes need explicit mailbox scoping from the profile.

## Helpdesk tools (Gorgias, Zendesk, Help Scout, Front)
- Tickets replace emails. Map ticket status, tags and assignee to categories and priority. Prefer internal notes or draft replies over public replies.
- Default to read plus internal note or draft. Do not change ticket status, merge, assign or send customer-facing replies without the profile allowing it.
- Macros and saved replies in the helpdesk are good voice and policy sources; ask the user whether to read them.

## Pasted or exported emails
- Accept pasted text, `.eml`, `.mbox`, `.msg` or a CSV export. Parse headers (from, to, date, subject, message-id, thread) when present.
- Nothing can be sent, labeled or archived in this mode. Deliver the digest and drafts in chat and the vault.
- For large mbox files, process with a script and sample first rather than reading everything into context.

## Store and CRM lookups (optional, read-only)
- E-commerce: Shopify, WooCommerce, BigCommerce or a shipping/tracking tool, if a connector is available. Look up order status, items, tracking, and refund state by order number or customer email. Use the result to fill draft placeholders.
- Match carefully: confirm the order number or email in the message matches the record before using its data. If two orders could match, ask or leave a placeholder.
- Small business: calendar (availability), CRM (existing relationship, deal stage), accounting (invoice status), read-only unless the profile says otherwise.
- Never perform refunds, cancellations, edits or other writes from triage.

## When no connector fits
Say which connection would help (for example "a Gmail connector") and continue with pasted emails. Do not try to log into webmail through a browser unless the user explicitly asks and approves.
