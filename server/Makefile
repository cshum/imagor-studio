# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
BINARY_NAME=imagor-studio-server
BINARY_UNIX=$(BINARY_NAME)_unix

# Main package paths
SELFHOSTED_MAIN_PACKAGE=./cmd/imagor-studio

# Build flags
LDFLAGS=-ldflags "-w -s"

# gqlgen
GQLGEN=go run github.com/99designs/gqlgen generate

all: test build

WEB_DIR=../web
STATIC_DIR=./static

prepare-static:
	cd $(WEB_DIR) && npm run build

check-static:
	@test -f $(STATIC_DIR)/index.html || (echo "missing embedded frontend assets in $(STATIC_DIR). Run 'make prepare-static' or build the web app first." && exit 1)

# build produces the public all-in-one binary with libvips + video support.
build: check-static
	mkdir -p static
	touch static/.placeholder
	$(GOBUILD) $(LDFLAGS) -tags vips -o $(BINARY_NAME) $(SELFHOSTED_MAIN_PACKAGE)

# Backward-compatible alias for older scripts.
build-selfhosted: build

build-with-static: prepare-static build

build-selfhosted-with-static: prepare-static build

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

LOCAL_GALLERY ?= ./gallery

dev:
	CGO_ENABLED=0 $(GOCMD) run $(SELFHOSTED_MAIN_PACKAGE) \
		--port=8080 \
		--file-storage-base-dir=$(LOCAL_GALLERY)

.PHONY: dev

# Cross compilation
build-linux: check-static
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GOBUILD) $(LDFLAGS) -o $(BINARY_UNIX) $(SELFHOSTED_MAIN_PACKAGE)

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

.PHONY: all build build-selfhosted build-with-static build-selfhosted-with-static prepare-static check-static test clean run deps tidy build-linux docker-build gqlgen gqlgen-init gqlgen-update

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
