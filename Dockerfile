ARG GOLANG_VERSION=1.25.1
ARG NODE_VERSION=22.19.0
ARG VIPS_VERSION=8.17.2

# Stage 1: Build web frontend
FROM node:${NODE_VERSION}-alpine AS web-builder

WORKDIR /app/web

# Copy package files
COPY web/package*.json ./

# Install dependencies
RUN npm ci

# Copy web source code
COPY web/ ./

# Build the frontend (outputs to ../server/static)
RUN npm run build

# Stage 2: Build server with libvips
FROM golang:${GOLANG_VERSION}-trixie AS server-builder

ARG VIPS_VERSION
ARG TARGETARCH

ENV PKG_CONFIG_PATH=/usr/local/lib/pkgconfig

# Install libvips + required libraries
RUN DEBIAN_FRONTEND=noninteractive \
  apt-get update && \
  apt-get install --no-install-recommends -y \
  ca-certificates \
  automake build-essential curl \
  meson ninja-build pkg-config \
  gobject-introspection gtk-doc-tools libglib2.0-dev libjpeg62-turbo-dev libpng-dev \
  libwebp-dev libtiff-dev libexif-dev libxml2-dev libpoppler-glib-dev \
  swig libpango1.0-dev libmatio-dev libopenslide-dev libcfitsio-dev libopenjp2-7-dev liblcms2-dev \
  libgsf-1-dev libfftw3-dev liborc-0.4-dev librsvg2-dev libimagequant-dev libaom-dev \
  libspng-dev libcgif-dev libheif-dev libheif-plugin-x265 libheif-plugin-aomenc libjxl-dev libavif-dev \
  libmagickwand-dev && \
  cd /tmp && \
    curl -fsSLO https://github.com/libvips/libvips/releases/download/v${VIPS_VERSION}/vips-${VIPS_VERSION}.tar.xz && \
    tar xf vips-${VIPS_VERSION}.tar.xz && \
    cd vips-${VIPS_VERSION} && \
    meson setup _build \
    --buildtype=release \
    --strip \
    --prefix=/usr/local \
    --libdir=lib \
    -Dmagick=enabled \
    -Djpeg-xl=enabled \
    -Dintrospection=disabled && \
    ninja -C _build && \
    ninja -C _build install && \
  ldconfig && \
  rm -rf /usr/local/lib/libvips-cpp.* && \
  rm -rf /usr/local/lib/*.a && \
  rm -rf /usr/local/lib/*.la

WORKDIR /app

# Copy Go module files
COPY server/go.mod server/go.sum ./server/

# Download Go dependencies
RUN cd server && go mod download

# Copy static files from web build
COPY --from=web-builder /app/server/static ./server/static

# Copy server source code
COPY server/ ./server/
COPY graphql/ ./graphql/

# Build the server binary
RUN cd server && go build -o /go/bin/imagor-studio ./cmd/server/main.go

# Stage 3: Runtime image
FROM debian:trixie-slim AS runtime
LABEL maintainer="imagor-studio"

COPY --from=server-builder /usr/local/lib /usr/local/lib
COPY --from=server-builder /etc/ssl/certs /etc/ssl/certs

# Install runtime dependencies
RUN DEBIAN_FRONTEND=noninteractive \
  apt-get update && \
  apt-get install --no-install-recommends -y \
  procps curl libglib2.0-0 libjpeg62-turbo libpng16-16 libopenexr-3-1-30 \
  libwebp7 libwebpmux3 libwebpdemux2 libtiff6 libexif12 libxml2 libpoppler-glib8t64 \
  libpango-1.0-0 libmatio13 libopenslide0 libopenjp2-7 libjemalloc2 \
  libgsf-1-114 libfftw3-bin liborc-0.4-0 librsvg2-2 libcfitsio10t64 libimagequant0 libaom3 \
  libspng0 libcgif0 libheif1 libheif-plugin-x265 libheif-plugin-aomenc libjxl0.11 \
  libmagickwand-7.q16-10 && \
  ln -s /usr/lib/$(uname -m)-linux-gnu/libjemalloc.so.2 /usr/local/lib/libjemalloc.so && \
  apt-get autoremove -y && \
  apt-get autoclean && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy the server binary
COPY --from=server-builder /go/bin/imagor-studio /usr/local/bin/imagor-studio

ENV VIPS_WARNING=0
ENV MALLOC_ARENA_MAX=2
ENV LD_PRELOAD=/usr/local/lib/libjemalloc.so

ENV PORT=8000
ENV STORAGE_PATH=/app/gallery

# Create data directory structure
RUN mkdir -p /app/gallery

# Set working directory
WORKDIR /app

# Use unprivileged user
USER nobody

ENTRYPOINT ["/usr/local/bin/imagor-studio"]

EXPOSE ${PORT}
