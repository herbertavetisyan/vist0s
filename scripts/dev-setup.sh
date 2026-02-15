#!/bin/bash
# Local development setup script for LOS

echo "🚀 Setting up VistLos development environment..."

# 1. Create environment file if it doesn't exist
if [ ! -f .env.development ]; then
    echo "Creating .env.development from example..."
    cp .env.example .env.development
fi

# 2. Start the local database using docker-compose
echo "Starting local database..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db

# 3. Wait for database to be ready
echo "Waiting for database to be ready..."
until docker exec vistos-db pg_isready -U postgres -d vistos > /dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo " Ready!"

# 4. Install dependencies
echo "Installing dependencies..."
npm install
cd client && npm install
cd ../server && npm install

# 5. Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate dev --name init

echo "✅ Setup complete!"
echo "To start the application in development mode:"
echo "1. Run 'npm run server' (starts backend)"
echo "2. Run 'cd client && npm run dev' (starts frontend)"
