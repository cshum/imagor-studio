# Cloud extraction layout plan

This document defines the next physical split target after the current logical mode split.

## Target layout

```text
cloud/
  server/
  web/
shared/
  graphql/
  contracts/
```

The current repo is already close to this shape logically:

- `server/cmd/imagor-studio-cloud` is a cloud-only server entrypoint seam.
- `server/internal/graphqlmode` already separates cloud and self-hosted GraphQL wiring.
- `web/src/router/cloud-routes.tsx` is a cloud-only route tree seam.
- `web/src/api/org-api.ts` is cloud-only frontend API surface.
- `web/codegen.cloud.ts` and `server/gqlgen.cloud.yml` are already mode-specific generation seams.

## What is already folder-ready

### Cloud server candidates

These files/packages are already cloud-oriented and can move with minimal behavior changes:

- `server/cmd/imagor-studio-cloud`
- `server/internal/graphqlmode/cloud_adapter.go`
- `server/internal/graphqlmode/cloud_passthrough.go`
- `server/internal/cloud`
- `server/gqlgen.cloud.yml`

### Cloud web candidates

These files are already cloud-specific and can be grouped under a future `cloud/web` boundary:

- `web/src/router/cloud-routes.tsx`
- `web/src/pages/cloud/`
- `web/src/loaders/cloud/`
- `web/src/layouts/cloud-account-layout.tsx`
- `web/src/api/org-api.ts`
- `web/src/generated/cloud/`
- `web/codegen.cloud.ts`

## What still blocks a physical move

### Shared server composition still lives in root server package

Cloud entry currently still depends on shared runtime wiring under:

- `server/internal/server`
- `server/internal/bootstrap`
- `server/internal/resolver`
- many `server/internal/*store` packages

That means `cloud/server` is not yet independently movable without either:

1. introducing `server/internal/app/cloudapp` as a dedicated composition root, or
2. extracting common services into a `shared/server` package.

### Cloud web still imports root shared modules

Cloud routes and APIs still depend on root-level modules such as:

- `web/src/router/shared-routes.tsx`
- `web/src/stores/auth-store.ts`
- `web/src/stores/folder-tree-bootstrap.ts`
- shared pages/components under `web/src/pages`, `web/src/components`, `web/src/lib`

This is good reuse, but it means a future `cloud/web` move still needs a stable shared boundary.

### Mode selection still happens inside shared runtime bootstraps

Current runtime decisions still happen in root selectors such as:

- `web/src/router.tsx`
- `web/src/loaders/root-page-loader.ts`
- `web/src/stores/auth-store.ts`
- `server/internal/graphqlmode/mode.go`

These should remain in the open repo only if this repo keeps acting as the self-hosted/shared base.
If cloud is extracted later, these selectors should be replaced by mode-fixed cloud entry files.

## Recommended next implementation target

Create fixed cloud entry seams without moving directories yet.

### Server

Add a dedicated cloud app composition package, for example:

- `server/internal/app/cloudapp`

Responsibility:

- build cloud GraphQL schema directly
- register only cloud HTTP routes
- isolate cloud-only auth behavior selection
- keep imports from shared services explicit

This reduces future move cost because `server/cmd/imagor-studio-cloud` can then import one cloud-focused package instead of generic shared server wiring.

### Web

Add cloud-fixed entry modules, for example:

- `web/src/cloud/router.tsx`
- `web/src/cloud/bootstrap.ts`
- `web/src/cloud/api/`

Responsibility:

- remove runtime `CLOUD_BUILD` branching from cloud entry path
- centralize cloud-only startup
- collect cloud-only API modules under one subtree

This keeps the current build working while making a later `cloud/web` folder move mostly mechanical.

## Extraction sequence

1. Keep current logical mode split intact.
2. Introduce fixed cloud entrypoints for server and web.
3. Move cloud-only files under `server/internal/app/cloudapp` and `web/src/cloud/*` first.
4. Convert root shared selectors into thin delegators.
5. After imports are stable, move to top-level `cloud/server` and `cloud/web`.
6. Only then split into a separate repo if desired.

## Rule of thumb

Before moving any file physically, make sure it satisfies one of these:

- cloud-only and imports only shared/common packages
- self-hosted-only and imports only shared/common packages
- shared and contains no runtime cloud/self-hosted branching

If a file still branches on mode, it is a seam file, not a final extracted file.

## Immediate coding target

The safest next code change is:

- introduce `web/src/cloud/` as a cloud-fixed frontend seam
- keep `web/src/router.tsx` as a delegator
- later do the same for `server/internal/app/cloudapp`

That gives a real folder-ready path without destabilizing builds.
