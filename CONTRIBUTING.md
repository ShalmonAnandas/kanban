# Contributing to Kanban Board

Thank you for your interest in contributing to this project! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database (local or cloud)
- Git

### Getting Started

1. **Fork and clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/kanban.git
cd kanban
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your database connection:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kanban"
```

4. **Set up the database**

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

5. **Run development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
kanban/
├── app/                  # Next.js App Router
│   ├── api/             # API routes
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/          # React components
├── lib/                 # Utility functions
├── prisma/             # Database schema
└── scripts/            # Deployment scripts
```

## Development Guidelines

### Code Style

- Use TypeScript for all new files
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic

### Component Guidelines

- Use Server Components by default
- Only use Client Components when needed (interactivity)
- Keep components focused and single-purpose
- Use TypeScript interfaces for props

### API Routes

- Use proper HTTP methods (GET, POST, PATCH, DELETE)
- Always validate input
- Return appropriate status codes
- Handle errors gracefully

### Database

- Always use Prisma Client for database access
- Never expose raw database errors to clients
- Use transactions for multi-step operations
- Index frequently queried fields

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clean, readable code
- Add comments where necessary
- Update documentation if needed

### 3. Test Your Changes

```bash
# Type checking
npm run lint

# Build test
npm run build

# Manual testing
npm run dev
```

### 4. Commit Your Changes

Use clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add task filtering feature"
```

Commit message format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title and description
- Link to any related issues
- Screenshots for UI changes

## Testing

### Manual Testing Checklist

- [ ] Create a new board
- [ ] Add tasks to columns
- [ ] Drag and drop tasks within a column
- [ ] Drag and drop tasks between columns
- [ ] Delete tasks
- [ ] Test on mobile screen sizes
- [ ] Test in different browsers

## Database Changes

### Creating a Migration

```bash
# After modifying schema.prisma
npx prisma migrate dev --name your_migration_name
```

### Resetting Database (Development)

```bash
npx prisma migrate reset
```

## Common Tasks

### Adding a New Feature

1. Design the feature
2. Update database schema if needed
3. Create API routes
4. Build UI components
5. Test thoroughly
6. Update documentation

### Fixing a Bug

1. Reproduce the bug
2. Write a test that fails
3. Fix the bug
4. Verify the test passes
5. Check for regressions

### Updating Dependencies

```bash
npm update
npm audit fix
```

## Need Help?

- Check existing issues and PRs
- Open a new issue for bugs or feature requests
- Ask questions in discussions

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
