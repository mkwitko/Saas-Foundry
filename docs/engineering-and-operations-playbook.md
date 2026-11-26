# Engineering, operations and cost playbook

The Foundry should recommend the simplest architecture that satisfies demonstrated product needs. It must not default to microservices, Kubernetes, paid observability suites or a preferred cloud provider.

## Architecture and scalability

Assess workload, tenant isolation, data sensitivity, consistency, background jobs, integrations, failure modes, availability needs and expected growth. Start with a modular monolith unless evidence justifies separation. Define:

- tenancy and authorization boundaries, including object-level access checks;
- data ownership, migrations, backups, restore tests and retention;
- API contracts, validation, idempotency, rate limits and webhook verification;
- queues and retry/dead-letter strategy where asynchronous work is justified;
- caching only with invalidation and correctness rules;
- connection pooling, indexes, query budgets and N+1 prevention;
- horizontal/vertical scaling triggers and capacity assumptions;
- dependency, secret, supply-chain and vulnerability management;
- disaster recovery objectives and operational ownership.

Do not design for hypothetical millions of users. Record the first measurable scaling threshold and the change that would trigger an architectural upgrade.

## Security baseline

Threat-model authentication, authorization, tenant boundaries, session lifecycle, secrets, input validation, injection, SSRF, CSRF, XSS, file uploads, webhooks, rate limits, abuse, dependency supply chain, backups and administrative access. Use least privilege and deny-by-default access. Add automated checks and negative tests for cross-tenant access and privilege escalation.

For health, finance or other sensitive domains, minimize collection, avoid sensitive content in logs and analytics, define retention and deletion, and review applicable laws and vendor data-processing terms. Never use real customer or patient data in tests or external AI prompts without explicit authorization and a lawful basis.

## Performance

Establish budgets before optimization: route-level LCP/INP/CLS, API latency percentiles, error rates, database query latency, queue age and bundle size. Measure representative journeys. Fix the measured bottleneck, then re-measure. Do not claim performance improvement from code inspection alone.

## Logs, metrics and tracing

Start with structured JSON logs, request/correlation IDs, environment and service version, redaction of secrets and personal data, and bounded retention. Add metrics for availability, latency, traffic, errors, saturation, queue health, business funnel and billing reconciliation. Add distributed tracing only when service boundaries and debugging needs justify it. Provide alerts with an owner, runbook and actionable threshold; avoid logging message bodies, credentials or health data.

## Free and low-cost infrastructure

Use catalog/free-services.yaml as a discovery index, not a promise that a provider is free. Verify official pricing, quotas, overage, region, data residency, cold-start behaviour, backup/export, lock-in and eligibility on the day of recommendation. Compare total cost at current and projected usage. Include self-hosting operational cost, not only the invoice.

Prefer a low-cost path that can be migrated safely. Do not select a free tier for sensitive production data without checking contractual and privacy suitability. Record provider, plan, quota, overage risk, region, exit path and cost owner.

## Sales and distribution

A build plan is incomplete without a route to buyers. Define ICP, trigger, qualification, value proposition, proof, offer, pricing, sales stages, demo, objections, follow-up, referrals and attribution. Build a small verified prospect list with evidence and public business contact routes. Prepare outreach drafts; do not send them without approval. Prioritize conversations and paid conversion over vanity traffic.

## Operational readiness

Before launch, verify health checks, error tracking, uptime monitoring, backups and restore, migration rollback, support route, incident owner, status communication, security contact, privacy policy, terms, data deletion, billing failure handling, and a release/rollback runbook. Production changes remain approval-gated.


## Preferred implementation profile: React + Node.js

For new web SaaS projects, React + TypeScript and Node.js + TypeScript are the default profile when they fit the product and team's capabilities. This is a starting preference, not a migration mandate. Preserve a working existing stack unless there is a measured business or engineering reason to change it.

### React frontend
- Reuse the framework already present (Next.js, Vite or another established React setup); do not introduce competing frameworks.
- Prefer semantic HTML, accessible primitives, explicit loading/empty/error/success states and progressive enhancement.
- Keep client-side state small. Prefer local state, URL state, server-state/query tooling or lightweight context according to ownership and lifecycle; do not add Redux by default.
- Validate forms at boundaries with Zod or the existing schema tool; avoid divergent client/server contracts where shared schemas are practical.
- Build components around repeated product patterns and real design-system needs, not every DOM element.
- Test critical journeys with the existing Playwright/Cypress setup. Review visual changes at mobile, tablet and desktop widths.
- Measure route-level Web Vitals, bundle size, hydration and interaction latency before optimizing.

### Node.js backend
- Prefer Fastify for new APIs when no established framework constrains the project; preserve Express, Nest or other working frameworks absent a clear migration case.
- Use vertical slices: route/schema → authorization → service/use case → repository/data access → tests.
- Validate all untrusted input at the boundary. Generate OpenAPI/Swagger from the same contract where practical.
- Use PostgreSQL for relational and transactional workloads by default; use the existing ORM/query layer (Prisma or otherwise) and inspect generated SQL.
- Enforce tenant and object-level authorization server-side. Add negative IDOR and cross-tenant tests.
- Make retryable writes idempotent; use transactions for multi-record invariants and explicit concurrency control for race-prone flows.
- Add Redis, queues, microservices or serverless only when measured workload or isolation needs justify them.

### Release quality
Require typecheck, lint, relevant unit/integration/E2E tests, reviewed database queries/indexes, security/privacy checks, measured performance budgets and a rollback/runbook. Prefer the smallest readable implementation, not code golf or speculative abstraction.
