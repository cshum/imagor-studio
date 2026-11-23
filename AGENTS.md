# AGENTS.md

Orientation for coding agents working in this repo. Read this before changing code; the docs under
`docs/docs/` are the user-facing reference and are the other source of truth.

## What this repo is

Imagor Studio is a self-hosted image gallery with a built-in editor. A Go server serves a React SPA, stores
files on the local filesystem or an S3-compatible bucket, and processes images through an embedded
[imagor](https://github.com/cshum/imagor) engine (libvips) plus `imagorvideo` (FFmpeg) for video frames.
Edits are non-destructive: the gallery never rewrites originals, it generates signed imagor URLs that apply
transformations at request time.

## Layout

| Path | What lives there |
|---|---|
| `server/cmd/imagor-studio` | Main binary (server + embedded frontend) |
| `server/cmd/imagor-studio-migrate` | Migration CLI (`--migrate-command up\|down\|status\|reset`) |
| `server/entrypoint` | Composition roots: runtime (self-hosted), processing runtime, migrations |
| `server/internal/` | Server internals: `bootstrap`, `config`, `server` (routes), `httphandler`, `resolver` (GraphQL), `userstore`, `registrystore`, `storageprovider`, `imagorprovider`, `imagortemplate`, `migrations`, `generated/gql` |
| `server/pkg/` | Cross-repo seams and shared packages: `apperror`, `auth`, `billing`, `management`, `processing`, `org`, `space`, `storage`, `signup`, `user`, `validation` |
| `graphql/*.graphql` | GraphQL schema, one file per domain (`user`, `storage`, `org`, `imagor`, `registry`) |
| `server/gqlgen.yml` | gqlgen config; generated code goes to `server/internal/generated/gql` |
| `web/src` | React app: `pages`, `components`, `layouts`, `routes` (TanStack Router), `loaders`, `stores`, `lib`, `api`, `locales` |
| `web/codegen.ts` | graphql-codegen config; reads `../graphql/*.graphql`, writes `web/src/generated` |
| `docs/docs` | Docusaurus documentation site |
| `Dockerfile`, `Dockerfile.ci` | Multi-stage builds on top of `ghcr.io/cshum/imagor-base` |

## Commands

```bash
make install                 # web npm ci + server go mod download
make dev                     # web dev server (:5173) + server (:8000)
make build                   # web build + server build (needs server/static)
make test                    # web type-check + server tests
make lint                    # eslint + go vet
make web-codegen             # regenerate web GraphQL artifacts

cd server && go build -tags vips ./...   # real build (CGO + libvips)
cd server && go test ./...               # what CI runs: no vips tag, no libvips needed
cd server && make gqlgen                 # regenerate server GraphQL code after schema edits
cd web && npm run type-check && npm run test:run
```

Docker builds take the base image as an argument:

```bash
docker build -t imagor-studio .
docker build --build-arg BASE_IMAGE=ghcr.io/cshum/imagor-base:<tag> -t imagor-studio .
```

## Invariants

- **Schema changes are a three-step change**: edit `graphql/*.graphql`, run `cd server && make gqlgen`,
  then `cd web && npm run codegen`. Never hand-edit `server/internal/generated/gql` or `web/src/generated`.
- **Composition over mode flags.** Hosted-only behaviour hangs off separate composition roots and
  capability packages, not `multiTenant` booleans sprinkled through handlers. Shared contracts live in
  `server/pkg/...` because Go's `internal/` blocks cross-repo imports; keep that seam narrow and give its
  exported interfaces specific names (`billing.Service`, not `contracts.Interface`).
- **One fact, one field.** If the schema can derive a value, expose it read-only instead of adding a
  second writable field. A duplicated writable field has already caused migration churn here.
- **Space identity.** Every API and store takes a space **ID**; only the `space(key: String!)` query
  resolves key → ID (`SpaceStore.GetByKey`). `space_key` stays unique and stored for rename/debug, but a
  slug change must never invalidate a cached loader — resolve once at the entry point. Registry keys are
  namespaced by space ID (`space.<spaceID>.config.*`); theme and language stay user-global.
- **Storage type.** `storageType` decides filesystem vs S3-compatible storage. Bucket, region and path
  prefix are locked after creation; only credentials are editable, and settings are validated on save with
  a presign probe rather than a separate "test" button.
- **Errors are contracts.** Return `apperror.ErrorInfo` codes (`VALIDATION_FAILED`, `STORAGE_NOT_FOUND`, …)
  and let the frontend branch on `extensions.code` via `web/src/lib/error-utils.ts` — never on message text,
  which changes with copy and translation. Add a dedicated code when a failure needs its own UI handling,
  and keep role-like fields as GraphQL enums with separate output and assignable-input types.
- **Signed URLs.** `imagor-secret` signs imagor paths (HMAC, sha1 by default, optional truncation). An
  empty secret means unsigned `/unsafe/` paths — fine for local runs, never for a deployment.
  App-generated URLs additionally carry the `it` marker (`server/pkg/processing/internal_traffic.go`): an
  HMAC-SHA256 of the canonical path, truncated to 32 chars, no expiry, cacheable. An invalid `it` is
  ignored, never rejected — do not turn it into an authorization check.
- **Processor build tag.** libvips/FFmpeg wiring lives behind `-tags vips`
  (`server/internal/imagorprovider/processor_vips.go`); the `!vips` counterpart keeps the server testable
  without native libraries. Keep both sides compiling.
- **Base image bumps are repo-wide.** `ARG BASE_IMAGE` and `ARG GOLANG_VERSION` in `Dockerfile` and
  `Dockerfile.ci`, plus `IMAGOR_BASE_IMAGE` in `Makefile`, `.github/workflows/docker.yml` and
  `docker-variants.yml`, all move together — `-dev` derives from the same string.

## Frontend conventions

- **Loaders carry data.** Routes fetch in `web/src/loaders/*` and read `useLoaderData`; a mutation invalidates
  the router. No react-query layer.
- **`useEffect` is a guide, not a ban.** Never for fetching, derived state, prop-change resets (`key`) or event
  handling — those go in the handler or a loader. Right for what lives outside React: observers, listeners,
  timers, third-party init, focus and measurement, each with a cleanup. The editor's ~160 effects are that
  kind; leave them.
- **i18n:** every user-visible string lives in `web/src/locales/*.json` (en, es, it, zh-CN, zh-TW). English
  is the reference wording; add or change a key in **all** locales in the same change, and delete keys from
  every locale when the element goes away.
- **URL parity is the core promise.** The editor status bar renders the generated imagor path token by
  token; parsing lives in `web/src/lib/image-editor-status-bar.ts` and must stay in step with
  `web/src/lib/imagor-path.ts` and the server's `imagortemplate` package. Keep the parity tests green.
  Split paths and filters with paren-depth-aware helpers — nested `image()`/`text()` arguments break naive
  `split('/')`.
- **Chrome vs permissions.** Editor chrome is toggled by URL params parsed in
  `web/src/lib/editor-state-url.ts` (`header`, `statusBar`, `zoom`, `controls`, `embedSyncUrl`); permissions
  come from the session. Hide actions the session cannot perform instead of disabling them.
- **Primary action is Copy URL** in the editor; Download is secondary and lives in the overflow menu.
  Template editing keeps Save Template primary, with Copy URL first in its menu.
- **`VITE_MULTI_TENANT`** selects multi-tenant presentation in the SPA; it is a build/runtime flag, not a
  permission. Do not document it in public deployment examples.
- **Never cache the folder tree by route.** It is keyed by space ID in browser storage; route caching it
  leaks the previous space's tree when switching spaces.
- **Auth shells** align to `max-w-6xl`; support/legal footer copy belongs to auth and public pages only.

## Testing expectations

- Server: `go test ./...` must pass without native libraries; tests that need Postgres use testcontainers,
  so they skip when Docker is unavailable. Do not "fix" a failing test by loosening the production call —
  set the expectation the code actually needs.
- Web: `npm run type-check` and `npm run test:run` before claiming a change works; component tests are
  Vitest + Testing Library.
- Image-processing changes need a real request, not just a build: run the container against a fixture and
  check the output with `vipsheader` (dimensions, bands, and `gainmap-*` for HDR sources).

## Pitfalls seen in practice

- Stale JWT org claims and cached router loader data show the previous user's data after logout — invalidate
  the router on login, logout and invite acceptance.
- Data loaded in an effect keyed on a dialog's open state double-fetches under StrictMode and flashes an empty
  list; fetch in the open handler or a loader.
- A refactor of the editor layout that drops `mobileSheetOpen` / `onMobileSheetOpenChange` silently breaks
  the mobile sheet; diff against the mobile branch and re-run `tsc`.
- Fully collapsing an empty editor column breaks CSS grid placement; keep the column at zero width (plus
  the drag rail) and freeze preview sizing while a drag is active or the preview loops.
- Signed requests fail with `url signature mismatch` when the secret, signer type or truncation differs
  between the URL generator and the server; a missing gallery file surfaces as a 500 with the raw `os`
  error rather than a 404.
- `node_modules` under `docs/` will drown any `grep -r`; scope searches to source paths.

## Docs

`docs/docs/{getting-started,configuration,features,api,deployment}` are the user-facing reference. When you
change a flag, an endpoint, or a visible behaviour, update the matching page in the same change — the docs
are versioned with the code and drift is treated as a bug.
