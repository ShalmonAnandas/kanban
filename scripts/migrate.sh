#!/bin/bash

# Vercel Database Migration Script
# Run this script during Vercel deployment to set up the database

set -e

echo "🚀 Starting Prisma database migration..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

echo "✅ Database migration completed successfully!"
