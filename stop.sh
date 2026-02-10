#!/bin/bash

# Stop and Clean Up Book-to-Course Docker Containers
# Options:
#   - Stop only: Stops containers but keeps volumes
#   - Full cleanup: Stops containers and removes all volumes (resets database)

set -e

echo "🛑 Book-to-Course Docker Cleanup"
echo "=================================="
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker Compose."
    exit 1
fi

# Show current running containers
echo "📊 Currently running Book-to-Course containers:"
docker-compose ps
echo ""

# Ask user what to do
echo "Choose cleanup option:"
echo "  1) Stop containers (keep data)"
echo "  2) Stop and remove containers (keep data)"
echo "  3) Stop, remove containers and volumes (⚠️  DELETE ALL DATA)"
echo "  4) Cancel"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo ""
        echo "🛑 Stopping containers..."
        docker-compose stop
        echo "✅ Containers stopped. Data preserved."
        echo "💡 Start again with: ./start.sh"
        ;;
    2)
        echo ""
        echo "🛑 Stopping and removing containers..."
        docker-compose down
        echo "✅ Containers removed. Volumes preserved."
        echo "💡 Your database data is still available."
        echo "💡 Start again with: ./start.sh"
        ;;
    3)
        echo ""
        echo "⚠️  WARNING: This will delete ALL data including:"
        echo "   - PostgreSQL database (users, books, lessons, videos)"
        echo "   - pgAdmin configuration"
        echo "   - Backend logs"
        echo ""
        read -p "Are you sure? Type 'yes' to confirm: " confirm
        if [ "$confirm" = "yes" ]; then
            echo ""
            echo "🗑️  Stopping and removing containers and volumes..."
            docker-compose down -v
            echo "✅ Complete cleanup done. All data removed."
            echo "💡 Start fresh with: ./start.sh"
        else
            echo "❌ Cleanup cancelled."
        fi
        ;;
    4)
        echo "❌ Cleanup cancelled."
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Cleanup cancelled."
        exit 1
        ;;
esac

echo ""
echo "📋 To view remaining containers:"
echo "   docker ps -a"
echo ""
echo "📋 To view remaining volumes:"
echo "   docker volume ls"
echo ""
echo "🧹 To clean up unused Docker resources:"
echo "   docker system prune -a"
