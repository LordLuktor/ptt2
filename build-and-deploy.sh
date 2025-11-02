#!/bin/bash

# Build and Deploy Script for Docker Swarm
# Usage: ./build-and-deploy.sh

set -e

echo "========================================="
echo "PTT App - Build and Deploy"
echo "========================================="

# Load environment variables from .env file
if [ -f .env ]; then
    echo "✓ Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "✗ Error: .env file not found"
    echo "Please create a .env file with:"
    echo "  EXPO_PUBLIC_SUPABASE_URL=your-url"
    echo "  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key"
    exit 1
fi

# Verify required environment variables
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ] || [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "✗ Error: Missing required environment variables"
    echo "Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env"
    exit 1
fi

echo "✓ Environment variables loaded"

# Build the Docker image
echo ""
echo "Building Docker image..."
docker build \
    --build-arg EXPO_PUBLIC_SUPABASE_URL="$EXPO_PUBLIC_SUPABASE_URL" \
    --build-arg EXPO_PUBLIC_SUPABASE_ANON_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY" \
    -t ptt-app:latest \
    .

echo "✓ Docker image built successfully"

# Deploy to Swarm
echo ""
echo "Deploying to Docker Swarm..."
docker stack deploy -c docker-compose.yml ptt

echo ""
echo "========================================="
echo "✓ Deployment complete!"
echo "========================================="
echo ""
echo "Check status with:"
echo "  docker service ls"
echo "  docker service logs ptt_ptt-app"
echo "  docker service ps ptt_ptt-app"
echo ""
echo "Access your app at: https://ptt.steinmetz.ltd"
echo ""
