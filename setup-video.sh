#!/bin/bash

# Setup video dependencies inside Docker container
# This installs npm packages in a Docker volume to ensure platform compatibility

set -e

echo "📦 Setting up video dependencies in Docker container..."

# Check if backend container is running
if ! docker ps | grep -q "book-to-course-backend"; then
    echo "❌ Backend container is not running"
    echo "💡 Please start the application first: ./start.sh"
    exit 1
fi

echo "🔧 Installing video dependencies (this may take a few minutes)..."
docker exec book-to-course-backend sh -c "cd /video && npm install"

if [ $? -eq 0 ]; then
    echo "✅ Video dependencies installed successfully in Docker volume"
    echo "💡 The dependencies are now Linux-compatible and ready for video generation"
else
    echo "❌ Failed to install video dependencies"
    exit 1
fi
