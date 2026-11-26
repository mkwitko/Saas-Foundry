# Product and interface quality gates

The Foundry treats product quality as a measurable delivery discipline, not a single visual score. A project can use a different visual language, but every user-facing screen must be reviewed against the same quality contract.

## Reference routing

Use the resources already catalogued by Foundry according to the job they perform:

- **Impeccable** — systematic UI critique, visual polish, consistency, accessibility and refinement. Use its full relevant workflow across every user-facing route when the skill is available and its current license, version and instructions have been reviewed.
- **Founder Skill** — founder discovery, business model, offer, validation and strategic decisions.
- **Marketing Skills** — positioning, pricing, SEO, CRO, content and distribution.
- **Brainstorming SaaS Ideas** — greenfield opportunity exploration, problem screening and kill criteria.
- **Replica Skill** — clean-room competitor teardown and public UX pattern analysis. Never copy code, assets, branding or protected content.
- **Oil UI** — visual implementation and component references; verify current availability and license.
- **B2B Growth Playbook** — channel, partnership, PLG/SLG and sales reference.

Visual inspiration sources are research inputs, not templates to copy:

- https://jiro.build/
- https://designspells.com/
- https://refero.design/
- https://www.supahero.io/
- https://mobbin.com/

Inspect current examples relevant to the product's audience and task. Record the source, observed pattern, why it helps the user, and the independent implementation decision. Do not reproduce a reference screen pixel-for-pixel.

## Required screen inventory

Before polishing UI, enumerate all routes and user-facing states. Include public marketing pages, authentication, onboarding, core product journeys, settings, billing, empty states, errors, loading states, permissions, responsive navigation and administrative surfaces where applicable.

For each screen record:

- route and purpose;
- primary user and task;
- entry and exit paths;
- key action and conversion/activation event;
- data dependencies and permissions;
- loading, empty, error, success and disabled states;
- mobile, tablet and desktop behaviour;
- accessibility requirements;
- performance budget and verification method.

A component gallery or landing-page screenshot is not a substitute for reviewing the complete product.

## Design system and visual craft

Establish or improve a coherent design system before screen-by-screen polish:

- typography scale and readable line lengths;
- semantic color tokens with accessible contrast;
- spacing, sizing, radius, elevation and border rules;
- layout grid and responsive breakpoints;
- iconography and illustration language;
- interaction, focus, hover, pressed, disabled and motion rules;
- reusable primitives and page-level composition;
- data visualization conventions;
- light/dark themes only when the product needs them.

Reject generic AI-generated visual sameness. Each product needs a distinct visual concept tied to its audience, value proposition, information density and brand personality. Prefer clear hierarchy, strong typography, deliberate whitespace, useful density and meaningful micro-interactions over decoration.

## Per-screen review loop

For every screen and important state:

1. Capture the current implementation at mobile, tablet and desktop breakpoints.
2. Review hierarchy, task clarity, content, alignment, spacing, typography, contrast, consistency and affordances.
3. Run the applicable Impeccable critique/refinement workflows. Do not skip screens because the home page looks polished.
4. Check keyboard navigation, visible focus, labels, semantics, contrast, reduced motion and screen-reader names.
5. Verify responsive overflow, touch target size, sticky elements, dialogs, tables and navigation.
6. Check loading, empty, error, success, disabled and permission-denied states.
7. Run visual regression or browser tests when the project has Playwright, Cypress or equivalent.
8. Fix the highest-impact issues and repeat the capture/review cycle.
9. Record remaining issues and evidence; never fabricate a perfect score.

## Quality scorecard

Score each screen from 0–5 in each dimension, with a note and evidence:

| Dimension | What a 5 means |
|---|---|
| Task clarity | Purpose and next action are immediately understandable |
| Visual hierarchy | Information priority is obvious and consistent |
| Craft and coherence | Typography, spacing, color, components and brand feel intentional |
| Responsive behaviour | No broken layout or interaction at supported sizes |
| Accessibility | Keyboard, focus, semantics, labels and contrast are verified |
| Interaction states | Loading, empty, error, success and disabled states are complete |
| Content quality | Clear, specific, trustworthy and appropriate to the user |
| Performance | No avoidable layout shift, oversized assets or blocking interaction |

A 5 requires evidence, not aesthetic preference. Any critical accessibility, broken-flow, security or data-loss issue blocks sign-off regardless of average score. Target at least 4.5/5 per screen before calling a screen polished; disclose any unverified dimensions. The target is a review threshold, not a guarantee of perfection or an externally certified Impeccable score.

## Release gate

A UI release is ready only when:

- every route in the inventory has been reviewed;
- critical journeys pass on mobile and desktop;
- no critical or high-severity accessibility issue remains;
- no known broken loading/empty/error/permission state remains in scope;
- visual checks and automated tests pass where available;
- performance budgets and key web vitals have been measured or explicitly marked unknown;
- design decisions and exceptions are recorded.
