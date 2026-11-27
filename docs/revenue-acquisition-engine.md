# Revenue and customer acquisition engine

The revenue engine makes the sales and acquisition pipeline measurable without turning the Foundry into an unsolicited messaging bot.

## Bootstrap and report

Each project receives an empty company-level pipeline at `.foundry/revenue/pipeline.yaml`. Add only business-level prospect information and sanitized evidence.

```bash
foundry revenue report .
foundry revenue report . --input ./exports/company-pipeline.yaml --format json
```

The report identifies qualification gaps, permission issues, stage counts, the current sales bottleneck and next actions. Funnel conversion is reported only when stage history is present; otherwise conversion is explicitly unknown.

## Qualification contract

A lead is considered qualified only when:
- fit is high or medium;
- pain is observed or reported by a real source, not merely hypothesized;
- a relevant buying role is known.

This is still a qualification hypothesis, not a confirmed buyer or purchase commitment.

## Permission and privacy

- Store organization, public website/source, segment, buying role and sanitized business evidence only.
- Never store contact names, personal emails, phone numbers, WhatsApp numbers, patient details, raw message bodies or transcripts in the pipeline.
- A lead must have explicit permission or a documented not-required basis before progressing into contacted/conversation/demo/proposal stages.
- A referral is not permission to contact a third party. Ask for an introduction or permission first.
- The CLI does not send emails, WhatsApp messages, DMs, calendar invitations, proposals or campaign content.

## Acquisition workflow

1. Define one narrow ICP and buyer problem.
2. Research a small company-level prospect list from public business sources or permission-based referrals.
3. Qualify fit, real pain evidence and buying role.
4. Secure permission or a warm introduction before contact.
5. Prepare a personalized message and discovery agenda as drafts.
6. Run a problem-focused conversation and demo.
7. Create a proposal tied to the buyer's outcome, implementation effort, risk and price.
8. Record the result, loss reason and next learning.
9. Scale a channel only after repeatable acquisition, activation, retention and delivery economics are visible.

For fewer than ten prospects, inspect every account individually and use absolute counts. Do not optimize a percentage from a tiny denominator.
