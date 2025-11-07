#!/bin/bash
set -e

echo "🔄 Resetting A2 Database..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Generate Prisma Client
echo "⚙️  Generating Prisma Client..."
npx prisma generate

# Reset database (clears all data and re-applies migrations)
echo "🗄️  Resetting database..."
npx prisma migrate reset --force --skip-seed

# Create superuser
echo "👤 Creating superuser..."
node prisma/createsu.js asnounsa demo.admin+reset@mail.utoronto.ca Passw0rd!

# Optional: Run seed if it exists
if [ -f "prisma/seed.js" ]; then
  echo "🌱 Running seed..."
  node prisma/seed.js || echo "⚠️  Seed failed or not needed"
fi

echo "✅ Reset complete! Ready to start server."
echo ""
echo "To start the server, run:"
echo "  node index.js 8000"

