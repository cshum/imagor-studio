# Imagor Studio - Root Makefile
# Orchestrates both web and server builds

# Project configuration
PROJECT_NAME=imagor-studio
DOCKER_IMAGE=$(PROJECT_NAME)
DOCKER_TAG=latest

# Directories
WEB_DIR=web
SERVER_DIR=server

# Colors for output
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

.PHONY: help
help: ## Show this help message
	@echo "$(GREEN)Imagor Studio - Available Commands:$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# =============================================================================
# Development Commands
# =============================================================================

.PHONY: install
install: web-install server-deps ## Install all dependencies (web + server)
	@echo "$(GREEN)✓ All dependencies installed$(NC)"

.PHONY: dev
dev: ## Start development servers (web + server concurrently)
	@echo "$(GREEN)Starting development servers...$(NC)"
	@echo "$(YELLOW)Web: http://localhost:5173$(NC)"
	@echo "$(YELLOW)Server: http://localhost:8000$(NC)"
	@(cd $(WEB_DIR) && npm run dev) & \
	(cd $(SERVER_DIR) && make run) & \
	wait

.PHONY: build
build: web-build server-build ## Build both web and server
	@echo "$(GREEN)✓ Full project build completed$(NC)"

.PHONY: clean
clean: web-clean server-clean ## Clean all build artifacts
	@echo "$(GREEN)✓ All build artifacts cleaned$(NC)"

.PHONY: test
test: web-test server-test ## Run all tests (web + server)
	@echo "$(GREEN)✓ All tests completed$(NC)"

.PHONY: lint
lint: web-lint server-lint ## Lint all code (web + server)
	@echo "$(GREEN)✓ All linting completed$(NC)"

.PHONY: format
format: web-format server-format ## Format all code (web + server)
	@echo "$(GREEN)✓ All code formatted$(NC)"

# =============================================================================
# Web Commands
# =============================================================================

.PHONY: web-install
web-install: ## Install web dependencies
	@echo "$(GREEN)Installing web dependencies...$(NC)"
	cd $(WEB_DIR) && npm ci

.PHONY: web-dev
web-dev: ## Start web development server
	@echo "$(GREEN)Starting web dev server...$(NC)"
	cd $(WEB_DIR) && npm run dev

.PHONY: web-build
web-build: ## Build web frontend
	@echo "$(GREEN)Building web frontend...$(NC)"
	cd $(WEB_DIR) && npm run build

.PHONY: web-preview
web-preview: ## Preview web build
	@echo "$(GREEN)Starting web preview...$(NC)"
	cd $(WEB_DIR) && npm run preview

.PHONY: web-test
web-test: ## Run web tests
	@echo "$(GREEN)Running web tests...$(NC)"
	cd $(WEB_DIR) && npm run type-check

.PHONY: web-lint
web-lint: ## Lint web code
	@echo "$(GREEN)Linting web code...$(NC)"
	cd $(WEB_DIR) && npm run lint

.PHONY: web-format
web-format: ## Format web code
	@echo "$(GREEN)Formatting web code...$(NC)"
	cd $(WEB_DIR) && npx prettier --write .

.PHONY: web-clean
web-clean: ## Clean web build artifacts
	@echo "$(GREEN)Cleaning web build artifacts...$(NC)"
	cd $(WEB_DIR) && rm -rf dist node_modules/.vite

.PHONY: web-codegen
web-codegen: ## Generate GraphQL code
	@echo "$(GREEN)Generating GraphQL code...$(NC)"
	cd $(WEB_DIR) && npm run codegen

.PHONY: web-codegen-watch
web-codegen-watch: ## Watch and generate GraphQL code
	@echo "$(GREEN)Watching GraphQL code generation...$(NC)"
	cd $(WEB_DIR) && npm run codegen:watch

# =============================================================================
# Server Commands
# =============================================================================

.PHONY: server-deps
server-deps: ## Download server dependencies
	@echo "$(GREEN)Downloading server dependencies...$(NC)"
	cd $(SERVER_DIR) && make deps && make tidy

.PHONY: server-dev
server-dev: ## Start server in development mode
	@echo "$(GREEN)Starting server in development mode...$(NC)"
	cd $(SERVER_DIR) && make run

.PHONY: server-build
server-build: ## Build server binary
	@echo "$(GREEN)Building server binary...$(NC)"
	cd $(SERVER_DIR) && make build

.PHONY: server-test
server-test: ## Run server tests
	@echo "$(GREEN)Running server tests...$(NC)"
	cd $(SERVER_DIR) && make test

.PHONY: server-lint
server-lint: ## Lint server code
	@echo "$(GREEN)Linting server code...$(NC)"
	cd $(SERVER_DIR) && go vet ./...

.PHONY: server-format
server-format: ## Format server code
	@echo "$(GREEN)Formatting server code...$(NC)"
	cd $(SERVER_DIR) && go fmt ./...

.PHONY: server-clean
server-clean: ## Clean server build artifacts
	@echo "$(GREEN)Cleaning server build artifacts...$(NC)"
	cd $(SERVER_DIR) && make clean

.PHONY: server-gqlgen
server-gqlgen: ## Generate GraphQL server code
	@echo "$(GREEN)Generating GraphQL server code...$(NC)"
	cd $(SERVER_DIR) && make gqlgen

.PHONY: server-reset-db
server-reset-db: ## Reset server database
	@echo "$(GREEN)Resetting server database...$(NC)"
	cd $(SERVER_DIR) && make reset-db

# =============================================================================
# Docker Commands
# =============================================================================

.PHONY: docker-build
docker-build: ## Build Docker image
	@echo "$(GREEN)Building Docker image...$(NC)"
	@echo "$(YELLOW)Image: $(DOCKER_IMAGE):$(DOCKER_TAG)$(NC)"
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .
	@echo "$(GREEN)✓ Docker image built successfully!$(NC)"
	@echo "$(YELLOW)To run: make docker-run$(NC)"

.PHONY: docker-run
docker-run: ## Run Docker container with persistent data
	@echo "$(GREEN)Running Docker container...$(NC)"
	@echo "$(YELLOW)Data directory: ./imagor-studio-data$(NC)"
	@mkdir -p ./imagor-studio-data
	docker run --rm -p 8000:8000 \
		-v "$(PWD)/imagor-studio-data":/app/data \
		-e DATABASE_URL="sqlite:///app/data/imagor-studio.db" \
		$(DOCKER_IMAGE):$(DOCKER_TAG)

.PHONY: docker-run-detached
docker-run-detached: ## Run Docker container in background with persistent data
	@echo "$(GREEN)Running Docker container in background...$(NC)"
	@echo "$(YELLOW)Data directory: ./imagor-studio-data$(NC)"
	@mkdir -p ./imagor-studio-data
	docker run -d --name $(PROJECT_NAME) -p 8000:8000 \
		-v "$(PWD)/imagor-studio-data":/app/data \
		-e DATABASE_URL="sqlite:///app/data/imagor-studio.db" \
		$(DOCKER_IMAGE):$(DOCKER_TAG)

.PHONY: docker-stop
docker-stop: ## Stop Docker container
	@echo "$(GREEN)Stopping Docker container...$(NC)"
	docker stop $(PROJECT_NAME) || true
	docker rm $(PROJECT_NAME) || true

.PHONY: docker-logs
docker-logs: ## Show Docker container logs
	docker logs -f $(PROJECT_NAME)

.PHONY: docker-shell
docker-shell: ## Open shell in Docker container
	docker exec -it $(PROJECT_NAME) sh

.PHONY: docker-compose-up
docker-compose-up: ## Start with docker-compose
	@echo "$(GREEN)Starting with docker-compose...$(NC)"
	docker-compose up --build

.PHONY: docker-compose-up-detached
docker-compose-up-detached: ## Start with docker-compose in background
	@echo "$(GREEN)Starting with docker-compose in background...$(NC)"
	docker-compose up -d --build

.PHONY: docker-compose-down
docker-compose-down: ## Stop docker-compose services
	@echo "$(GREEN)Stopping docker-compose services...$(NC)"
	docker-compose down

.PHONY: docker-clean
docker-clean: ## Clean Docker images and containers
	@echo "$(GREEN)Cleaning Docker images and containers...$(NC)"
	docker system prune -f
	docker image rm $(DOCKER_IMAGE):$(DOCKER_TAG) 2>/dev/null || true

# =============================================================================
# Production Commands
# =============================================================================

.PHONY: prod-build
prod-build: clean install build ## Full production build
	@echo "$(GREEN)✓ Production build completed$(NC)"

.PHONY: prod-docker
prod-docker: docker-clean docker-build ## Build production Docker image
	@echo "$(GREEN)✓ Production Docker image built$(NC)"

.PHONY: release
release: prod-build prod-docker ## Full release build (local + Docker)
	@echo "$(GREEN)✓ Release build completed$(NC)"
	@echo "$(YELLOW)Docker image: $(DOCKER_IMAGE):$(DOCKER_TAG)$(NC)"

# =============================================================================
# Utility Commands
# =============================================================================

.PHONY: check-deps
check-deps: ## Check if required tools are installed
	@echo "$(GREEN)Checking dependencies...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)Node.js is required but not installed$(NC)"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)npm is required but not installed$(NC)"; exit 1; }
	@command -v go >/dev/null 2>&1 || { echo "$(RED)Go is required but not installed$(NC)"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)Docker is required but not installed$(NC)"; exit 1; }
	@echo "$(GREEN)✓ All required dependencies are installed$(NC)"

.PHONY: status
status: ## Show project status
	@echo "$(GREEN)Project Status:$(NC)"
	@echo "$(YELLOW)Web:$(NC)"
	@cd $(WEB_DIR) && npm list --depth=0 2>/dev/null | head -1 || echo "  Dependencies not installed"
	@echo "$(YELLOW)Server:$(NC)"
	@cd $(SERVER_DIR) && go version 2>/dev/null || echo "  Go not available"
	@echo "$(YELLOW)Docker:$(NC)"
	@docker images $(DOCKER_IMAGE) 2>/dev/null | grep -v REPOSITORY || echo "  No Docker images found"

.PHONY: info
info: ## Show project information
	@echo "$(GREEN)Imagor Studio Project$(NC)"
	@echo "$(YELLOW)Web Frontend:$(NC) React + Vite + TypeScript"
	@echo "$(YELLOW)Server Backend:$(NC) Go + GraphQL + imagor + libvips"
	@echo "$(YELLOW)Docker:$(NC) Multi-stage build for server, web and runtime"
	@echo ""
	@echo "$(YELLOW)Development URLs:$(NC)"
	@echo "  Web:    http://localhost:5173"
	@echo "  Server: http://localhost:8000"
	@echo ""
	@echo "$(YELLOW)Quick Start:$(NC)"
	@echo "  make install  # Install dependencies"
	@echo "  make dev      # Start development"
	@echo "  make build    # Build project"
	@echo "  make docker-build # Build Docker image"
