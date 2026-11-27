# React + Node.js project profile

This is the Foundry's preferred default for new web SaaS products. It is not a mandate to migrate existing projects.

## Default stack

| Layer | Default | Decision rule |
|---|---|---|
| Language | TypeScript | Use across frontend and backend where practical |
| UI | React | Keep the framework already in the repository |
| Web framework | Next.js or Vite | Select based on SSR/SEO, routing, deployment and app needs; do not add both without a clear reason |
| API | Fastify | Preferred for new Node APIs; preserve existing Express/Nest where migration has no proven value |
| Validation | Zod | Validate untrusted input at boundaries; reuse contracts where practical |
| API docs | OpenAPI/Swagger | Generate or maintain from the same contract |
| Database | PostgreSQL | Default for relational, transactional SaaS data |
| ORM/data access | Existing ORM; Prisma is a reasonable default | Inspect SQL and transactions; do not hide query costs |
| Testing | Vitest/Jest + Playwright | Follow existing stack; critical journeys must be E2E tested |
| State | Local/URL/server state | Redux is not the default |
| Architecture | Modular monolith | Split services only for measured operational or scaling reasons |

## Product engineering rules

- Keep domain logic independent from UI components and HTTP transport.
- Use vertical slices for product capabilities.
- Enforce tenant and object authorization on the server.
- Use explicit DTOs/contracts at trust boundaries.
- Keep database transactions short and define concurrency behaviour.
- Use idempotency for retryable mutations and webhook processing.
- Avoid premature caching; define invalidation and correctness first.
- Add queues only for work that benefits from asynchronous execution/retry.
- Measure before optimizing.
- Prefer managed infrastructure until cost, workload or compliance justifies self-hosting.

## React UX rules

- Semantic HTML and keyboard-accessible controls.
- Design tokens and reusable components only for repeated patterns.
- Every async screen has loading, empty, error and success behaviour.
- Every form has validation, useful errors and submission state.
- Mobile-first layouts with tested tablet/desktop behaviour.
- Avoid inaccessible custom controls and unnecessary client-side JavaScript.
- Critical user journeys are tested with real browser automation.
- Review conversion surfaces and core product UX separately.

## Node API rules

- Route/schema → authorization → use case → repository → tests.
- Validate path, query, headers and body.
- Use consistent errors and status codes.
- Test authorization denial and cross-tenant access.
- Review query plans, indexes, N+1 and pool limits.
- Handle race conditions with transactions/constraints/locking where appropriate.
- Verify webhooks and make event handling idempotent.
- Keep logs structured, redacted and free of credentials or sensitive customer content.

## Exceptions

Choose another stack when:
- the project already has a healthy implementation;
- required SDKs or integrations are materially better supported elsewhere;
- team capability and operational ownership favour another ecosystem;
- deployment, compliance or performance constraints demand it.

Document the decision and the cost of migration. Stack preference must never outrank customer value or evidence.
