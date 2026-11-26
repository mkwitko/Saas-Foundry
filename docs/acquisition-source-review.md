# Review of external startup-distribution repositories

Reviewed: 2026-11-26. These repositories are discovery inputs, not an approved bulk-submission plan.

## 1. Primary structured directory dataset

**Source:** [mmmmingos/where-to-submit-your-startup](https://github.com/mmmmingos/where-to-submit-your-startup)  
**License:** MIT (2026; retain copyright and license notice with substantial copies).  
**Observed README snapshot:** 1,191 places; 93 free, 564 free with conditions, 216 paid, 286 reported problems; README says last checked 26 Nov 2026.

Why it is the primary candidate:
- Each directory has a last-checked date.
- It distinguishes free, conditional-free, paid, and reported-problem entries.
- The project points to a planner and a read-only MCP/API for richer records including requirements, pricing, audience fit, wait times, notes and attempted submissions.
- It includes a skill for agents, but Foundry should not install or execute that skill by default.

Important limitations:
- A last-checked date is not a guarantee that a listing is still open or suitable.
- A reported problem may be a failed submission, policy change, dead link or another issue; preserve the source's own classification.
- The dataset is broad and global. A directory listing is not proof of qualified traffic, leads or revenue.
- Re-check the destination's own submission page and terms before recommending or submitting.

## 2. Broad discovery catalogue

**Source:** [submit-directories/awesome-startup-directories](https://github.com/submit-directories/awesome-startup-directories)  
**License:** CC0 as declared in its README.  
**Observed scope:** directories, launch platforms, communities/forums, alternatives, marketplaces, design galleries, regional startup media, web directories and submission services.

Use it to discover candidate channels that the primary dataset may not cover. It includes pricing and SEO/DR claims attributed to third-party sources; those metrics must not be treated as independently verified. Its README itself records pricing conflicts and states that some links were checked in October 2026.

## 3. Historical community and website list

**Source:** [mmccaff/PlacesToPostYourStartup](https://github.com/mmccaff/PlacesToPostYourStartup)  
**License:** CC0 as declared in its README.  
**Observed scope:** alphabetical lists of subreddits and startup websites.

Use it only as a discovery seed. It has limited per-entry freshness, policy, pricing and eligibility metadata, so every candidate requires fresh verification. Do not assume that a subreddit permits promotion because it appears in this list.

## Foundry integration decision

| Source | Role | Default trust |
|---|---|---|
| where-to-submit-your-startup | Primary directory dataset | Candidate record; verify before action |
| awesome-startup-directories | Secondary channel discovery | Unverified candidate |
| PlacesToPostYourStartup | Historical discovery seed | Unverified candidate |

The next acquisition milestone should normalize records into a Foundry-owned catalogue without blindly copying or executing upstream skills:

- `source_id`, canonical repository URL, exact reviewed commit, license and attribution;
- `record_id`, channel type, destination URL, geography, audience, product/stage eligibility;
- pricing, conditions, promotion rules, required assets and submission URL;
- source last-checked date, Foundry verification date, evidence URL and freshness state;
- known issues, status, confidence, and a human-review requirement.

A channel should move through `discovered → researched → eligible → approved → submitted → outcome_recorded`. Only a human can approve external submissions, posts, outreach or paid placements. Reddit/community discovery must separately capture each community's current rules and must not enable unsolicited DMs, scraping that violates platform terms, or repetitive promotional posts.

## Application to ia-chat

The global startup-directory lists are not the first acquisition channel for a Brazilian WhatsApp SaaS aimed at clinics and independent service professionals. The initial priority remains referrals, targeted conversations with qualified local businesses, and relevant professional partnerships. Directory submissions are a low-cost secondary experiment after the landing page and offer are ready. Generic startup directories should not outrank channels that can reach actual clinic owners.

No submission, outreach, paid listing, account creation, scraping or data import was performed during this review.
