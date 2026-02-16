# Testing Guide

This document describes how to test the Kanban application.

## Manual Testing

### Setup Test Database

1. Ensure you have a test PostgreSQL database:
```bash
# Using Docker
docker run --name kanban-test -e POSTGRES_PASSWORD=test -p 5433:5432 -d postgres
```

2. Update `.env.test`:
```bash
DATABASE_URL="postgresql://postgres:test@localhost:5433/kanban_test"
```

3. Push schema:
```bash
DATABASE_URL="postgresql://postgres:test@localhost:5433/kanban_test" npm run db:push
```

### Test Checklist

#### User Session Tests
- [ ] Open the app in incognito mode
- [ ] Verify you can see the default board
- [ ] Create a task
- [ ] Close browser and reopen - verify your tasks persist
- [ ] Try in different browser - should get different anonymous user

#### Board Tests
- [ ] Default board "My Kanban Board" is created automatically
- [ ] Board has three default columns: To Do, In Progress, Done
- [ ] Board displays user's tasks

#### Task Creation Tests
- [ ] Click "+ Add task" in any column
- [ ] Enter task title
- [ ] Click "Add" - task appears immediately
- [ ] Task has title and no description by default
- [ ] Refresh page - task persists

#### Drag and Drop Tests
- [ ] Drag task within same column
  - Task moves to new position
  - Other tasks reorder correctly
  - Refresh page - order persists
- [ ] Drag task to different column
  - Task appears in new column
  - Task removed from old column
  - Order updated in both columns
  - Refresh page - changes persist
- [ ] Drag task to empty column
  - Task moves successfully
  - Refresh page - change persists

#### Task Deletion Tests
- [ ] Click X button on task card
- [ ] Task disappears immediately
- [ ] Refresh page - task is gone

#### Mobile Responsiveness Tests
- [ ] Open on mobile device or resize browser
- [ ] Columns scroll horizontally
- [ ] Touch drag and drop works
- [ ] Add task form is usable
- [ ] Text is readable

#### Error Handling Tests
- [ ] Disconnect from internet
- [ ] Try to create a task - should show error
- [ ] Try to drag a task - should revert on failure
- [ ] Reconnect - operations should work again

#### Performance Tests
- [ ] Create 50+ tasks
- [ ] Drag and drop should be smooth
- [ ] Page load should be fast
- [ ] No memory leaks during extended use

## API Testing with cURL

### Get All Boards
```bash
curl http://localhost:3000/api/boards \
  -H "Cookie: kanban_user_id=YOUR_USER_ID"
```

### Create Board
```bash
curl -X POST http://localhost:3000/api/boards \
  -H "Content-Type: application/json" \
  -H "Cookie: kanban_user_id=YOUR_USER_ID" \
  -d '{"title": "Test Board"}'
```

### Create Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: kanban_user_id=YOUR_USER_ID" \
  -d '{"title": "Test Task", "columnId": "COLUMN_ID"}'
```

### Reorder Task
```bash
curl -X POST http://localhost:3000/api/tasks/reorder \
  -H "Content-Type: application/json" \
  -H "Cookie: kanban_user_id=YOUR_USER_ID" \
  -d '{"taskId": "TASK_ID", "columnId": "COLUMN_ID", "newOrder": 1}'
```

### Delete Task
```bash
curl -X DELETE http://localhost:3000/api/tasks/TASK_ID \
  -H "Cookie: kanban_user_id=YOUR_USER_ID"
```

## Database Testing

### Check Data with Prisma Studio
```bash
npm run db:studio
```

This opens a browser interface to view and edit database records.

### Direct SQL Queries
```bash
# Connect to database
psql postgresql://postgres:postgres@localhost:5432/kanban

# List users
SELECT * FROM users;

# List boards
SELECT * FROM boards;

# List columns
SELECT * FROM columns;

# List tasks
SELECT * FROM tasks;

# Check task ordering
SELECT c.title as column, t.title as task, t.order 
FROM tasks t 
JOIN columns c ON t."columnId" = c.id 
ORDER BY c.order, t.order;
```

## Expected Behavior

### Database Schema
- User: Anonymous users with auto-generated cuid IDs
- Board: Each user can have multiple boards
- Column: Each board has ordered columns
- Task: Each column has ordered tasks
- Cascading deletes: Deleting board deletes columns and tasks

### Optimistic Updates
- UI updates immediately on drag/drop
- API call happens in background
- If API fails, UI reverts to previous state
- If successful, UI keeps optimistic state

### Security
- All operations verify user ownership
- Cookies are httpOnly and secure in production
- CSRF protection via sameSite: 'lax'
- No SQL injection risk (using Prisma ORM)

## Known Limitations

- No authentication required (anonymous users only)
- No board sharing between users
- No real-time collaboration
- No task descriptions editing UI (can be added)
- No task due dates or priorities

## Future Test Additions

When adding automated tests:
- Unit tests for utility functions
- Integration tests for API routes
- E2E tests for user workflows
- Performance tests for large datasets
