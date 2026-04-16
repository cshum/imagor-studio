# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
BINARY_NAME=imagor-studio-server
BINARY_UNIX=$(BINARY_NAME)_unix

# Main package path
MAIN_PACKAGE=./cmd/imagor-studio

# Build flags
LDFLAGS=-ldflags "-w -s"

# gqlgen
GQLGEN=go run github.com/99designs/gqlgen generate

all: test build

# build produces the full self-hosted binary with libvips + video support.
# Use build-management for a no-CGO management-only binary.
build:
	mkdir -p static
	touch static/.placeholder
	$(GOBUILD) $(LDFLAGS) -tags vips -o $(BINARY_NAME) $(MAIN_PACKAGE)

test:
	$(GOTEST) -v ./...

clean:
	$(GOCLEAN)
	rm -f $(BINARY_NAME)
	rm -f $(BINARY_UNIX)

run: build
	./$(BINARY_NAME)

deps:
	$(GOGET) ./...

tidy:
	$(GOMOD) tidy

# ── Local development run targets ────────────────────────────────────────────
# Shared secret for local SaaS simulation (overridable: make run-management LOCAL_SECRET=mysecret)
LOCAL_SECRET ?= dev-secret
LOCAL_GALLERY ?= ./gallery

# Self-hosted dev run: no CGO, SQLite, no libvips — fast iteration.
# All-in-one: GraphQL + admin UI + imagor at /imagor/.
dev:
	CGO_ENABLED=0 $(GOCMD) run $(MAIN_PACKAGE) \
		--port=8080 \
		--file-storage-base-dir=$(LOCAL_GALLERY)

# SaaS: management node — GraphQL + admin UI + org/space CRUD.
# No CGO, no libvips. Enables InternalAPISecret so OrgStore/SpaceStore are active.
# No --file-storage-base-dir: management node has no system-level storage in SaaS mode.
# File listing and imagor URL generation are handled by the processing node.
run-management:
	CGO_ENABLED=0 $(GOCMD) run $(MAIN_PACKAGE) \
		--port=8080 \
		--internal-api-secret=$(LOCAL_SECRET)

# SaaS: processing node — imagor image proxy, no DB.
# Requires libvips (CGO). Polls management on :8080 for space configs.
# After startup, space config is served from in-memory SpaceConfigStore.
run-processing:
	$(GOCMD) run -tags vips $(MAIN_PACKAGE) \
		--port=8081 \
		--jwt-secret=$(LOCAL_SECRET) \
		--spaces-endpoint=http://localhost:8080 \
		--internal-api-secret=$(LOCAL_SECRET) \
		--space-max-concurrency=4

.PHONY: dev run-management run-processing

# ── SaaS binary targets ───────────────────────────────────────────────────────
# management binary: no CGO, no libvips — suitable for Fly.io management machines
# (handles GraphQL, storage config, user/org/space CRUD, delta endpoint).
BINARY_MANAGEMENT=imagor-studio-management

build-management:
	mkdir -p static
	touch static/.placeholder
	CGO_ENABLED=0 $(GOBUILD) $(LDFLAGS) -o $(BINARY_MANAGEMENT) $(MAIN_PACKAGE)

# processing binary: compiled with -tags vips — requires libvips + CGO.
# Deployed on processing machines; routes image requests per space.
BINARY_PROCESSING=imagor-studio-processing

build-processing:
	mkdir -p static
	touch static/.placeholder
	$(GOBUILD) $(LDFLAGS) -tags vips -o $(BINARY_PROCESSING) $(MAIN_PACKAGE)

# Cross compilation
build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GOBUILD) $(LDFLAGS) -o $(BINARY_UNIX) $(MAIN_PACKAGE)

docker-build:
	docker build -t imagor-studio-server .

generate: gqlgen

# gqlgen commands
gqlgen:
	$(GQLGEN) --config gqlgen.yml

gqlgen-init:
	$(GQLGEN) init

gqlgen-update:
	$(GQLGEN) --verbose --config gqlgen.yml

.PHONY: all build test clean run deps tidy build-linux build-management build-processing docker-build gqlgen gqlgen-init gqlgen-update

clean-db:
	rm -f storage.db

reset-db: clean-db setup-db

# Migration commands
MIGRATE_BINARY=imagor-studio-migrate

migrate-build:
	$(GOBUILD) $(LDFLAGS) -o $(MIGRATE_BINARY) ./cmd/imagor-studio-migrate

migrate-up: migrate-build
	./$(MIGRATE_BINARY) --migrate-command=up

migrate-down: migrate-build
	./$(MIGRATE_BINARY) --migrate-command=down

migrate-status: migrate-build
	./$(MIGRATE_BINARY) --migrate-command=status

migrate-reset: migrate-build
	./$(MIGRATE_BINARY) --migrate-command=reset

migrate-clean:
	rm -f $(MIGRATE_BINARY)

.PHONY: setup-db clean-db reset-db migrate-build migrate-up migrate-down migrate-status migrate-reset migrate-clean
