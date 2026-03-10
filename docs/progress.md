# Velora Progress

## Stage checklist

- [x] Stage 0 - Repo audit, bootstrap, workspace foundation
- [ ] Stage 1 - API foundation, auth, core data model
- [ ] Stage 2 - Storefront foundation
- [ ] Stage 3 - Catalog, category, product detail, search UX
- [ ] Stage 4 - Cart, inventory, stock reservation
- [ ] Stage 5 - Checkout, orders, payments
- [ ] Stage 6 - Promotions and pricing engine
- [ ] Stage 7 - Customer account and order history
- [ ] Stage 8 - Admin backoffice
- [ ] Stage 9 - Seller portal
- [ ] Stage 10 - Performance, cache, query, rate limiting pass
- [ ] Stage 11 - Test hardening, CI, docs, final polish

## Completed milestones

### Stage 0

- Audited the empty local folder and fetched the remote repository state.
- Confirmed `origin/main` as the default branch and created a working `dev` branch.
- Bootstrapped a pnpm workspace with the required apps and shared package boundaries.
- Added root scripts, TypeScript base configuration, ESLint, Prettier, and editor settings.
- Added Docker Compose services for PostgreSQL, Redis, and OpenSearch.
- Added initial environment examples, README, and repository documentation baseline.
- Verified `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test`.

## Important implementation notes

- Internal packages are designed to build independently so the apps can consume stable outputs.
- Stage 0 intentionally keeps database migration and seed scripts as placeholders until the schema lands in Stage 1.
- The workspace already includes the mandatory top-level scripts so later stages can evolve without changing the developer workflow contract.

## Known follow-up items

- Implement the NestJS API runtime, configuration module, health endpoint, and first domain modules.
- Add the transactional schema and deterministic seed pipeline.
- Replace placeholder database scripts with real migration and seed commands.
