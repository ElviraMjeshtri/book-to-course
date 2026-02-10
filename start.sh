#!/bin/bash

# Complete Docker Deployment Script for Book-to-Course Application
# Single command to start everything: infrastructure + backend + frontend

set -e

echo "🚀 Starting Book-to-Course Application with Docker"
echo "===================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    echo "💡 On Mac: Start Docker Desktop"
    echo "💡 On Linux: sudo systemctl start docker"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker is running"

# Video dependencies will be installed in Docker volume (see setup-video.sh)
echo "💡 Video dependencies: will be installed in Docker container volume"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found"
    echo ""
    if [ -f ".env.example" ]; then
        echo "📄 Creating .env from .env.example..."
        cp .env.example .env
        echo "✅ .env file created. Please update it with your credentials."
        echo ""
        read -p "Press Enter to continue or Ctrl+C to exit and configure .env first..."
    else
        echo "❌ .env.example not found. Please create .env manually."
        exit 1
    fi
fi

echo "🔧 Building and starting services..."
echo "--------------------------------------"

# Build images first (ensures latest code is included)
echo "Building Docker images..."
docker-compose build

echo ""
echo "Starting database services..."

# Start database first
docker-compose up -d postgres pgadmin

echo "⏳ Waiting for PostgreSQL to be ready..."
echo "   This may take a few moments on first run..."

# Wait for PostgreSQL to be healthy
timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker-compose ps | grep -q "postgres.*Up.*healthy"; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    sleep 3
    elapsed=$((elapsed + 3))
    echo "   Still waiting for PostgreSQL... ($elapsed/${timeout}s)"
done

if [ $elapsed -ge $timeout ]; then
    echo "❌ PostgreSQL failed to start within ${timeout}s"
    echo "🔍 Check logs: docker-compose logs postgres"
    exit 1
fi

echo ""
echo "🔄 Initializing database schema..."
echo "-----------------------------------"

# Run database initialization
docker-compose run --rm db-init

echo ""
echo "🌐 Starting application services..."
echo "-----------------------------------"

# Start backend and frontend
docker-compose up -d backend frontend

echo ""
echo "⏳ Waiting for applications to be ready..."
timeout=90
elapsed=0
while [ $elapsed -lt $timeout ]; do
    backend_ready=false
    frontend_ready=false

    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        backend_ready=true
    fi

    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        frontend_ready=true
    fi

    if [ "$backend_ready" = true ] && [ "$frontend_ready" = true ]; then
        echo "✅ Applications are ready!"
        break
    fi

    sleep 5
    elapsed=$((elapsed + 5))
    echo "   Still waiting... ($elapsed/${timeout}s)"
done

if [ $elapsed -ge $timeout ]; then
    echo "⚠️  Applications may still be starting..."
    echo "🔍 Check service logs:"
    echo "   docker-compose logs backend"
    echo "   docker-compose logs frontend"
fi

echo ""
echo "👤 Creating demo user..."
docker exec book-to-course-backend python create_demo_user.py

echo ""
echo "📦 Setting up video dependencies..."
echo "   Installing Node.js packages in Docker container..."
docker exec book-to-course-backend sh -c "cd /video && npm install" > /dev/null 2>&1 &
VIDEO_INSTALL_PID=$!
echo "   Installation running in background (PID: $VIDEO_INSTALL_PID)"
echo "💡 Video generation will be available once installation completes (~2-3 min)"

echo ""
echo "🎉 Book-to-Course Application is now running!"
echo "=============================================="
echo ""
echo "📍 Available services:"
echo "   🌐 Frontend Web App:  http://localhost:5173"
echo "   🔧 Backend API:       http://localhost:8000"
echo "   📖 API Docs:          http://localhost:8000/docs"
echo "   📊 pgAdmin:           http://localhost:5050"
echo "      Username: admin@booktocourse.local"
echo "      Password: admin123"
echo ""
echo "🎬 Video Generation:"
echo "   ✅ ffmpeg installed in backend container"
echo "   📹 Optional Remotion Studio (for advanced video editing):"
echo "      docker-compose --profile video up -d video-service"
echo "      Then visit: http://localhost:3001"
echo ""
echo "💡 Backend can generate videos using ffmpeg directly"
echo ""
echo "🔐 Database connection details:"
echo "   Host:     localhost"
echo "   Port:     5432"
echo "   Database: book_to_course"
echo "   User:     admin"
echo "   Password: password123"
echo ""
echo "🛑 To stop all services:"
echo "   docker-compose down"
echo ""
echo "🗑️  To stop and remove volumes (reset data):"
echo "   docker-compose down -v"
echo ""
echo "📊 To view service status:"
echo "   docker-compose ps"
echo ""
echo "📋 To view logs:"
echo "   docker-compose logs [service-name]"
echo "   docker-compose logs -f [service-name]  # Follow logs"
echo ""
echo "🔄 To restart a service:"
echo "   docker-compose restart [service-name]"
echo ""
echo "Happy learning! 🎓"
