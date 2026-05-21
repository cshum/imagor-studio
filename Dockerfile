ARG NODE_VERSION=22.19.0
ARG GOLANG_VERSION=1.26.3
ARG BASE_IMAGE=ghcr.io/cshum/imagor-base:vips8.18.2-r8-magick-ffmpeg
ARG DEV_BASE_IMAGE=${BASE_IMAGE}-dev
ARG EMBEDDED_MODE=false

# Stage 1: Build web frontend
FROM node:${NODE_VERSION}-alpine AS web-builder

ARG EMBEDDED_MODE

WORKDIR /app/web

COPY web/package*.json ./

RUN npm ci

COPY web/ ./

# Build the frontend with embedded mode environment variable
RUN export VITE_EMBEDDED_MODE=${EMBEDDED_MODE:-false} && npm run build

# Stage 2: Build server using imagor-base ffmpeg+magick dev image
FROM golang:${GOLANG_VERSION}-bookworm AS golang-base

FROM ${BASE_IMAGE} AS native-base

FROM ${DEV_BASE_IMAGE} AS server-builder

ARG EMBEDDED_MODE

COPY --from=golang-base /usr/local/go /usr/local/go

ENV GOPATH=/go
ENV PATH=/usr/local/go/bin:/go/bin:$PATH
ENV CGO_ENABLED=1
ENV PKG_CONFIG_PATH=/opt/imagor/lib/pkgconfig
ENV CGO_CFLAGS=-I/opt/imagor/include
ENV CGO_LDFLAGS="-L/opt/imagor/lib -Wl,-rpath,/opt/imagor/lib"

WORKDIR /app

COPY server/go.mod server/go.sum ./server/

RUN cd server && go mod download

# Copy static files from web build
COPY --from=web-builder /app/server/static ./server/static

COPY server/ ./server/
COPY graphql/ ./graphql/

RUN cd server && go build -tags vips -o /go/bin/imagor-studio ./cmd/imagor-studio/main.go

# Conditionally build migration tool (not needed for embedded mode)
RUN if [ "$EMBEDDED_MODE" != "true" ]; then \
      cd server && go build -o /go/bin/imagor-studio-migrate ./cmd/imagor-studio-migrate/main.go; \
    else \
      touch /go/bin/imagor-studio-migrate; \
    fi

# Stage 3: Runtime image
FROM native-base AS runtime
LABEL maintainer="imagor-studio"

RUN DEBIAN_FRONTEND=noninteractive \
  apt-get update && \
  apt-get upgrade -y && \
  apt-get install --no-install-recommends -y \
  curl gosu passwd procps \
  fontconfig fonts-dejavu-core && \
  ln -s /usr/lib/$(uname -m)-linux-gnu/libjemalloc.so.2 /usr/local/lib/libjemalloc.so && \
  apt-get autoremove -y && \
  apt-get autoclean && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY --from=server-builder /go/bin/imagor-studio /usr/local/bin/imagor-studio

# Copy migration tool (will be empty file for embedded mode)
COPY --from=server-builder /go/bin/imagor-studio-migrate /usr/local/bin/imagor-studio-migrate

# Remove migration tool if in embedded mode and set environment variable
ARG EMBEDDED_MODE
RUN if [ "$EMBEDDED_MODE" = "true" ]; then \
      rm -f /usr/local/bin/imagor-studio-migrate; \
    fi

# Set EMBEDDED_MODE environment variable for runtime if built with embedded mode
ENV EMBEDDED_MODE=${EMBEDDED_MODE}

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV VIPS_WARNING=0
ENV MALLOC_ARENA_MAX=2
ENV LD_PRELOAD=/usr/local/lib/libjemalloc.so
ENV XDG_CACHE_HOME=/tmp

ENV PORT=8000

# User/Group configuration
ENV PUID=65534
ENV PGID=65534

RUN mkdir -p /app/gallery && mkdir -p /app/data

WORKDIR /app

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["/usr/local/bin/imagor-studio"]

EXPOSE ${PORT}
