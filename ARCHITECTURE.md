# Architecture Documentation

This document describes the architecture and design decisions for the Kanban board application.

## Overview

The application is a production-ready Kanban board built with Next.js 14, featuring:
- Server-side rendering for optimal performance
- Anonymous user authentication via cookies
- Drag-and-drop task management with optimistic updates
- PostgreSQL database with Prisma ORM
- One-click deployment to Vercel

## Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **React 19**: UI library with Server/Client Components
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS 4**: Utility-first CSS framework
- **@dnd-kit**: Drag-and-drop functionality

### Backend
- **Next.js API Routes**: RESTful API endpoints
- **Prisma 5**: Type-safe ORM
- **PostgreSQL**: Relational database

### Infrastructure
- **Vercel**: Hosting and deployment platform
- **Vercel Postgres**: Managed PostgreSQL database

## Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Next.js App (React Components)             │  │
│  │  ┌────────────────┐  ┌────────────────────────────┐ │  │
│  │  │ Server         │  │ Client Components          │ │  │
│  │  │ Components     │  │ - KanbanBoard (DnD)        │ │  │
│  │  │ - Page Layout  │  │ - KanbanColumn            │ │  │
│  │  │ - Data Fetching│  │ - TaskCard                │ │  │
│  │  └────────────────┘  └────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕ HTTP/S
┌─────────────────────────────────────────────────────────────┐
│                      Next.js Server                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   API Routes                         │  │
│  │  - /api/boards          - GET, POST                  │  │
│  │  - /api/boards/[id]     - GET, PATCH, DELETE         │  │
│  │  - /api/tasks           - POST                       │  │
│  │  - /api/tasks/[id]      - PATCH, DELETE              │  │
│  │  - /api/tasks/reorder   - POST                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Business Logic Layer                     │  │
│  │  - lib/session.ts  - User session management         │  │
│  │  - lib/prisma.ts   - Database client singleton       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕ SQL
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Tables:                                             │  │
│  │  - users    (anonymous users)                        │  │
│  │  - boards   (user's boards)                          │  │
│  │  - columns  (board columns)                          │  │
│  │  - tasks    (column tasks)                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Patterns

### 1. Server Components by Default

All components are Server Components unless they need client-side interactivity. This provides:
- Better performance (less JavaScript sent to client)
- Direct database access in components
- Automatic code splitting

Example:
```typescript
// app/page.tsx - Server Component
export default async function Home() {
  const board = await prisma.board.findFirst(...) // Direct DB access
  return <KanbanBoard initialBoard={board} />
}
```

### 2. Client Components for Interactivity

Only components that need interactivity are Client Components:
- `KanbanBoard` - Drag-and-drop state management
- `KanbanColumn` - Task creation form
- `TaskCard` - Individual task with drag handle

### 3. Optimistic Updates

UI updates immediately before server confirmation:

```typescript
// 1. Update UI optimistically
setBoard(newState)

// 2. Send to server
const response = await fetch('/api/tasks/reorder', ...)

// 3. If success, keep optimistic state
if (response.ok) {
  const serverState = await response.json()
  setBoard(serverState) // Sync with server
}
// If failure, state would revert (not shown for brevity)
```

### 4. Anonymous User System

Users are identified by a cuid stored in an httpOnly cookie. Server components read the cookie
and redirect to `/api/session` to initialize it when missing; route handlers create and set it.

```typescript
export async function getUserIdFromCookie(): Promise<string | null> {
  return cookieStore.get(USER_COOKIE_NAME)?.value ?? null
}

export async function getUserId(): Promise<string> {
  let userId = cookieStore.get(USER_COOKIE_NAME)?.value
  
  if (!userId) {
    const user = await prisma.user.create({ data: {} })
    userId = user.id
    cookieStore.set(USER_COOKIE_NAME, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
  }
  
  return userId
}
```

### 5. Database Schema Design

The schema uses cascading deletes for data integrity:

```prisma
model Board {
  id      String   @id @default(cuid())
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  columns Column[] // Deleted when board is deleted
}

model Column {
  id    String @id @default(cuid())
  board Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)
  tasks Task[] // Deleted when column is deleted
}
```

## Security Architecture

### Authentication
- Anonymous users via cookie-based sessions
- No passwords or personal information required
- Users identified by unique cuid

### Authorization
All API routes verify ownership before allowing operations:

```typescript
// Verify task belongs to user
const task = await prisma.task.findFirst({
  where: {
    id: taskId,
    column: {
      board: {
        userId, // Verify through relationships
      },
    },
  },
})
```

### Data Protection
- httpOnly cookies prevent XSS attacks
- secure flag ensures HTTPS in production
- sameSite: 'lax' prevents CSRF
- Prisma ORM prevents SQL injection

## Data Flow

### Task Creation Flow

```
User clicks "+ Add task"
  ↓
Input form appears (Client Component)
  ↓
User enters title, clicks "Add"
  ↓
POST /api/tasks
  ↓
getUserId() from cookie
  ↓
Verify column belongs to user
  ↓
Create task in database
  ↓
Return new task JSON
  ↓
Update UI with new task
```

### Drag and Drop Flow

```
User starts dragging task
  ↓
DragStartEvent - Store active task
  ↓
DragOverEvent - Calculate new position
  ↓
Optimistically update UI (immediate feedback)
  ↓
DragEndEvent - Persist to server
  ↓
POST /api/tasks/reorder
  ↓
Verify ownership
  ↓
Transaction: Update all affected task orders
  ↓
Return updated board state
  ↓
Sync UI with server state
```

## Database Design

### Relationships

```
User (1) ──< (N) Board
Board (1) ──< (N) Column
Column (1) ──< (N) Task
```

### Indexes

- `boards.userId` - Fast user board lookup
- `columns.boardId` - Fast board column lookup
- `tasks.columnId` - Fast column task lookup

### Order Fields

- `columns.order` - Column display order
- `tasks.order` - Task position within column

## Performance Optimizations

1. **Server Components**: Reduce client-side JavaScript
2. **Incremental Static Regeneration**: Cache pages when possible
3. **Database Indexes**: Fast query performance
4. **Optimistic Updates**: Instant UI feedback
5. **Connection Pooling**: Prisma handles efficiently

## Deployment Architecture

```
GitHub Repository
  ↓ git push
Vercel Build
  ↓ npm run build
  ├─ Prisma Generate
  ├─ Prisma Migrate
  └─ Next.js Build
  ↓
Vercel Edge Network (CDN)
  ↓
Serverless Functions (API Routes)
  ↓
Vercel Postgres Database
```

## Scalability Considerations

### Current Capacity
- Single database per deployment
- Serverless functions auto-scale
- No rate limiting (relies on Vercel limits)

### Future Enhancements
- Add Redis for session caching
- Implement rate limiting per user
- Add database read replicas
- Implement WebSocket for real-time updates
- Add background job processing

## Monitoring and Observability

### Available Metrics
- Vercel Analytics: Page views, performance
- Vercel Logs: API request logs
- Database Metrics: Connection pool, query time

### Recommended Additions
- Error tracking (Sentry)
- Performance monitoring (New Relic)
- User analytics (PostHog)

## Testing Strategy

### Current State
- Manual testing via browser
- Build-time TypeScript checking
- ESLint for code quality

### Recommended Additions
- Unit tests (Jest + React Testing Library)
- Integration tests (API routes)
- E2E tests (Playwright)
- Load testing (k6)

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [@dnd-kit Documentation](https://docs.dndkit.com/)
- [Vercel Documentation](https://vercel.com/docs)
