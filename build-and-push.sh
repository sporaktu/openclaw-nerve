#!/bin/bash
set -euo pipefail

REGISTRY="localhost:5000"
IMAGE="nerve"
TAG="${1:-latest}"

echo "Building ${IMAGE}:${TAG}..."
docker build -t ${REGISTRY}/${IMAGE}:${TAG} .

echo "Pushing to ${REGISTRY}..."
docker push ${REGISTRY}/${IMAGE}:${TAG}

echo "Done: ${REGISTRY}/${IMAGE}:${TAG}"
