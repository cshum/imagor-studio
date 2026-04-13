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
