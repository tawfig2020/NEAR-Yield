#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

# Check required environment variables
required_vars=(
    "NEAR_NODE_URL"
    "NEAR_NETWORK_ID"
    "NEAR_CONTRACT_ID"
    "INFLUX_USERNAME"
    "INFLUX_PASSWORD"
    "INFLUX_ORG"
    "INFLUX_BUCKET"
    "INFLUX_TOKEN"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set"
        exit 1
    fi
done

# Build and deploy steps
echo "Starting deployment process..."

# 1. Pull latest changes
echo "Pulling latest changes..."
git pull origin main

# 2. Install dependencies
echo "Installing dependencies..."
(cd backend && npm ci)
(cd frontend && npm ci)

# 3. Run tests
echo "Running tests..."
(cd backend && npm test)
(cd frontend && npm test)

# 4. Build Docker images
echo "Building Docker images..."
docker-compose build

# 5. Stop existing containers
echo "Stopping existing containers..."
docker-compose down

# 6. Start new containers
echo "Starting new containers..."
docker-compose up -d

# 7. Run database migrations
echo "Running database migrations..."
docker-compose exec backend npm run migrate

# 8. Health check
echo "Performing health check..."
max_retries=30
counter=0
until curl -s http://localhost/api/health > /dev/null; do
    if [ $counter -eq $max_retries ]; then
        echo "Error: Health check failed after $max_retries attempts"
        exit 1
    fi
    echo "Waiting for services to be ready..."
    sleep 2
    ((counter++))
done

# 9. Cleanup
echo "Cleaning up old Docker images..."
docker image prune -f

echo "Deployment completed successfully!"
echo "Frontend: http://localhost"
echo "Backend: http://localhost:3000"
echo "InfluxDB: http://localhost:8086"
