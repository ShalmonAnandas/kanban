# Kanban Board - Production-Ready Next.js 14 Application

A modern, production-grade Kanban board built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma, and Vercel Postgres. Features anonymous user sessions, drag-and-drop functionality with optimistic UI updates, and one-click Vercel deployment.

## Features

- 🚀 **Next.js 14 with App Router** - Latest Next.js features for optimal performance
- 🎨 **Tailwind CSS** - Utility-first CSS for rapid UI development
- 🗄️ **Prisma + Vercel Postgres** - Type-safe database ORM with PostgreSQL
- 🎯 **@dnd-kit Drag & Drop** - Smooth, accessible drag-and-drop with optimistic updates
- 👤 **Anonymous User System** - Cookie-based sessions with unique IDs (no passwords needed)
- 📱 **Mobile Responsive** - Works seamlessly on all devices
- ⚡ **Optimistic UI** - Instant feedback with automatic rollback on errors
- 🔄 **Cross-Device Sync** - Access your boards from any device with your unique ID
- 📦 **One-Click Deploy** - Pre-configured for Vercel deployment

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL (Vercel Postgres)
- **ORM**: Prisma 7
- **Drag & Drop**: @dnd-kit
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or Vercel Postgres)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ShalmonAnandas/kanban.git
cd kanban
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database connection string:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/kanban?schema=public"
```

4. Generate Prisma client and push database schema:
```bash
npm run db:generate
npm run db:push
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

### Local Development

For local development, you can use a local PostgreSQL instance:

```bash
# Using Docker
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres

# Update .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kanban?schema=public"

# Push schema to database
npm run db:push
```

### Vercel Postgres (Production)

1. Go to your Vercel project dashboard
2. Navigate to Storage → Create Database → Postgres
3. Copy the connection strings to your environment variables
4. Deploy your application

## Deployment to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ShalmonAnandas/kanban)

> Note: Make sure to add a Vercel Postgres database after deployment from the Storage tab.

### Manual Deployment

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add Vercel Postgres database in Storage tab
4. Deploy

The `vercel.json` configuration ensures:
- Prisma client is generated during build
- Database migrations are applied automatically
- Environment variables are properly configured

## Project Structure

```
kanban/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── boards/       # Board CRUD operations
│   │   └── tasks/        # Task operations & reordering
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── KanbanBoard.tsx   # Main board component with DnD
│   ├── KanbanColumn.tsx  # Column component
│   └── TaskCard.tsx      # Task card component
├── lib/                   # Utility functions
│   ├── prisma.ts         # Prisma client singleton
│   └── session.ts        # Anonymous user session management
├── prisma/               # Database schema and migrations
│   └── schema.prisma     # Prisma schema
├── public/               # Static assets
├── .env                  # Environment variables (not in git)
├── .env.example          # Example environment variables
├── vercel.json           # Vercel deployment config
└── package.json          # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Features in Detail

### Anonymous User System

Users are automatically created with a unique ID stored in a secure HTTP-only cookie. No registration or login required. The cookie persists for 1 year, enabling seamless cross-device access.

### Drag & Drop

Built with @dnd-kit for:
- Smooth animations
- Keyboard accessibility
- Touch device support
- Optimistic UI updates

### Optimistic Updates

All drag-and-drop operations update the UI immediately, then sync with the server in the background. If the server request fails, the UI automatically reverts to the previous state.

### Database Schema

- **User**: Anonymous users with unique IDs
- **Board**: Each user can have multiple boards
- **Column**: Boards contain ordered columns (To Do, In Progress, Done)
- **Task**: Tasks belong to columns and can be reordered

## API Routes

- `GET /api/boards` - List all boards for current user
- `POST /api/boards` - Create a new board
- `GET /api/boards/[boardId]` - Get board details
- `PATCH /api/boards/[boardId]` - Update board
- `DELETE /api/boards/[boardId]` - Delete board
- `POST /api/tasks` - Create a new task
- `PATCH /api/tasks/[taskId]` - Update task
- `DELETE /api/tasks/[taskId]` - Delete task
- `POST /api/tasks/reorder` - Reorder tasks (drag & drop)

## Architecture Reference

This project follows best practices from modern Next.js applications, with inspiration from the ShalmonAnandas/space repository architecture:
- Server Components by default for optimal performance
- Client Components only where interactivity is needed
- API routes for data mutations
- Optimistic updates for snappy UX

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions, please open an issue on GitHub.
