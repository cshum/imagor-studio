#!/bin/bash

# Build script for imagor-studio Docker image

set -e

IMAGE_NAME="imagor-studio"
TAG="${1:-latest}"

echo "Building imagor-studio Docker image..."
echo "Image: ${IMAGE_NAME}:${TAG}"

# Build the Docker image
docker build -t "${IMAGE_NAME}:${TAG}" .

echo "Build completed successfully!"
echo ""
echo "To run the container:"
echo "  docker run -p 8000:8000 ${IMAGE_NAME}:${TAG}"
echo ""
echo "To run with environment variables:"
echo "  docker run -p 8000:8000 -e DATABASE_URL=your_db_url ${IMAGE_NAME}:${TAG}"
