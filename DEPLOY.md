# Vercel Deployment Guide

This guide will help you deploy your Kanban application to Vercel in just a few clicks.

## Prerequisites

- A Vercel account (free tier is fine)
- GitHub repository with your code

## Deployment Steps

### 1. Set up Vercel Postgres

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Storage" in the sidebar
3. Click "Create Database"
4. Select "Postgres" (free tier available)
5. Choose a name for your database (e.g., "kanban-db")
6. Select your region
7. Click "Create"

### 2. Deploy the Application

#### Option A: One-Click Deploy (Recommended)

1. Click the "Deploy with Vercel" button in the README
2. Connect your GitHub account if you haven't already
3. Name your project (e.g., "my-kanban-board")
4. Click "Deploy"

#### Option B: Manual Deploy

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure your project:
   - Framework Preset: **Next.js**
   - Root Directory: `./` (leave default)
   - Build Command: `npm run build` (or use vercel.json config)
5. Click "Deploy"

### 3. Connect Database to Application

After deploying:

1. Go to your project settings
2. Click "Storage" tab
3. Click "Connect Store"
4. Select your Postgres database
5. Click "Connect"

Vercel will automatically inject the following environment variables:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_URL_NO_SSL`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

The application will use `POSTGRES_PRISMA_URL` or fallback to `DATABASE_URL`.

### 4. Redeploy with Database Connection

1. Go to "Deployments" tab
2. Click "..." on the latest deployment
3. Click "Redeploy"
4. Check "Use existing Build Cache"
5. Click "Redeploy"

This will:
- Generate Prisma Client
- Run database migrations
- Build the application
- Deploy to production

### 5. Test Your Application

1. Click "Visit" to open your deployed application
2. You should see the Kanban board
3. Try creating tasks and dragging them around
4. Your data is automatically persisted to Vercel Postgres

## Environment Variables (Optional)

You can add custom environment variables in project settings:

- `SESSION_SECRET` - For secure cookie encryption (auto-generated if not set)

## Database Management

### View Database with Prisma Studio

```bash
# Local
npm run db:studio

# Production (with connection string from Vercel)
DATABASE_URL="<your-vercel-postgres-url>" npm run db:studio
```

### Run Migrations

Migrations run automatically during deployment via `vercel.json`.

To run manually:
```bash
npm run db:migrate
```

### Push Schema Changes

For development:
```bash
npm run db:push
```

## Troubleshooting

### Build Fails

1. Check build logs in Vercel dashboard
2. Ensure all environment variables are set
3. Verify database is connected

### Database Connection Issues

1. Verify `POSTGRES_PRISMA_URL` is set in environment variables
2. Check database is running in Vercel Storage
3. Redeploy to refresh connection

### Migration Errors

If migrations fail:

1. Go to Vercel Storage → your database
2. Click "Query" tab
3. Run this SQL to check migrations:
   ```sql
   SELECT * FROM _prisma_migrations;
   ```
4. If needed, reset database and redeploy

## Custom Domain (Optional)

1. Go to project settings → "Domains"
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

## Monitoring

- View application logs in Vercel dashboard
- Monitor database usage in Storage tab
- Set up alerts for errors

## Scaling

The free tier includes:
- Unlimited requests
- 100GB bandwidth
- 0.5GB Postgres storage
- 60 compute hours

To scale up:
- Upgrade to Pro plan for more resources
- Postgres storage scales automatically with plan

## Support

For issues:
- Check [Vercel Documentation](https://vercel.com/docs)
- Open an issue on GitHub
- Contact Vercel support (Pro plan)
