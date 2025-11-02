#!/bin/bash

# Test Build Script
# Tests the web build locally before Docker deployment

set -e

echo "========================================="
echo "Testing Web Build"
echo "========================================="

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist/

# Build for web
echo "Building for web..."
npm run build:web

# Check if build succeeded
if [ -d "dist" ]; then
    echo "✓ Build successful!"
    echo ""
    echo "Build output:"
    ls -lh dist/
    echo ""
    echo "To test locally, run:"
    echo "  npx serve dist"
    echo "  # or"
    echo "  python3 -m http.server 8000 --directory dist"
else
    echo "✗ Build failed - dist directory not found"
    exit 1
fi
