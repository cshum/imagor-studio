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
MAIN_PACKAGE=./cmd/server

# Build flags
LDFLAGS=-ldflags "-w -s"

# gqlgen
GQLGEN=go run github.com/99designs/gqlgen generate

all: test build

build:
	$(GOBUILD) $(LDFLAGS) -o $(BINARY_NAME) $(MAIN_PACKAGE)

test:
	$(GOTEST) -v ./...

clean:
	$(GOCLEAN)
	rm -f $(BINARY_NAME)
	rm -f $(BINARY_UNIX)

run:
	$(GOBUILD) $(LDFLAGS) -o $(BINARY_NAME) $(MAIN_PACKAGE)
	./$(BINARY_NAME)

deps:
	$(GOGET) ./...

tidy:
	$(GOMOD) tidy

# Cross compilation
build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GOBUILD) $(LDFLAGS) -o $(BINARY_UNIX) $(MAIN_PACKAGE)

docker-build:
	docker build -t imagor-studio-server .

# gqlgen commands
gqlgen:
	$(GQLGEN) --config gqlgen.yml

gqlgen-init:
	$(GQLGEN) init

gqlgen-update:
	$(GQLGEN) --verbose --config gqlgen.yml

.PHONY: all build test clean run deps tidy build-linux docker-build gqlgen gqlgen-init gqlgen-update

clean-db:
	rm -f storage.db

reset-db: clean-db setup-db

.PHONY: setup-db clean-db reset-db
