# Copilot instructions

Read **`AGENTS.md`** at the repo root first — it is the single source of truth for layout, commands,
invariants and pitfalls in this repo. This file only repeats the rules that break silently.

- GraphQL changes are three steps: edit `graphql/*.graphql`, `cd server && make gqlgen`, then
  `cd web && npm run codegen`. Never hand-edit `server/internal/generated/gql` or `web/src/generated`.
- Every store and API takes a space **ID**; only the `space(key: String!)` query resolves key → ID.
- Return `apperror.ErrorInfo` codes; the frontend branches on `extensions.code`, never on message text.
- Every user-visible string goes into **all** `web/src/locales/*.json` in the same change, English first.
- Editor status-bar tokens must match the generated imagor path exactly; parity tests are load-bearing.
- libvips/FFmpeg wiring is behind `-tags vips`; `go test ./...` (no tag) must keep compiling and passing.
- `ARG BASE_IMAGE` / `ARG GOLANG_VERSION` in `Dockerfile` and `Dockerfile.ci`, plus `IMAGOR_BASE_IMAGE` in
  `Makefile` and both docker workflows, move together.
