# Web build stage
FROM node:18-bookworm AS web-builder

WORKDIR /app/web

# Copy package files first for better caching
COPY web/package*.json ./

# Install dependencies (this layer will be cached if package.json doesn't change)
RUN npm ci

# Copy web source code
COPY web/ .

# Build the web application
RUN npm run build

# Go build stage
FROM golang:1.24-bookworm AS go-builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy go mod files first for better caching
COPY server/go.mod server/go.sum ./

# Download dependencies (this layer will be cached if go.mod/go.sum don't change)
RUN go mod download

# Copy server source code
COPY server/ .

# Build the Go application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Final stage
FROM debian:bookworm-slim

# Install ca-certificates for HTTPS requests
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /root/

# Copy the Go binary from go-builder stage
COPY --from=go-builder /app/server .

# Copy the web assets from web-builder stage
COPY --from=web-builder /app/web/dist ./web/dist

# Expose port
EXPOSE 8080

# Run the binary
CMD ["./server"]
