import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import postgres from 'postgres'
import { encrypt, encryptNullable } from '@/lib/encryption'
import { initSchema } from '@/lib/db-schema'
import { getNeonDatabaseUrl, normalizePostgresUrl } from '@/lib/db'

/**
 * Migration scheduler: copies data from the old Prisma Postgres database to the new Neon database.
 * 
 * Trigger options:
 * - Manual: POST /api/migrate (with Authorization header matching MIGRATION_SECRET)
 * - Vercel Cron: configured in vercel.json to run daily
 * - Disable: set MIGRATION_ENABLED=false in environment variables
 * 
 * The migration is idempotent - it uses INSERT ... ON CONFLICT DO NOTHING
 * so it can be safely re-run without duplicating data.
 */

// Connect to old Prisma database (read-only).
// Uses only PRISMA_DATABASE_URL to avoid accidentally connecting to the
// same Neon database that the main app uses (DATABASE_URL, POSTGRES_URL, etc.).
function getPrismaDb() {
  const rawUrl = process.env.POSTGRES_URL?.trim()
  if (!rawUrl) return { db: null, reason: 'missing' }

  const normalized = normalizePostgresUrl(rawUrl)
  try {
    const parsed = new URL(normalized)
    if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
      return { db: null, reason: 'unsupported protocol (expected postgres:// or postgresql://)' }
    }
    return { db: postgres(normalized, { ssl: 'require' }), reason: null }
  } catch {
    return { db: null, reason: 'invalid URL format' }
  }
}

// Connect to new Neon database (write)
function getNeonDb() {
  const url = getNeonDatabaseUrl()
  if (!url) {
    throw new Error(
      'No Neon database URL found. See .env.example for required variables.'
    )
  }
  return neon(url)
}

export async function POST(request: Request) {
  try {
    // Check if migration is disabled
    if (process.env.MIGRATION_ENABLED === 'false') {
      return NextResponse.json(
        { message: 'Migration is disabled. Set MIGRATION_ENABLED to enable.' },
        { status: 200 }
      )
    }

    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // For Vercel Cron jobs, check the Authorization header
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startTime = Date.now()
    const { db: oldDb, reason: prismaDbReason } = getPrismaDb()
    if (!oldDb) {
      const message =
        prismaDbReason === 'missing'
          ? 'Migration skipped: PRISMA_DATABASE_URL is not configured. Set it to the old database URL (postgres:// or postgresql://) to enable migration.'
          : `Migration skipped: PRISMA_DATABASE_URL is set but unusable (${prismaDbReason}). Set it to the old database URL (postgres:// or postgresql://) to enable migration.`
      return NextResponse.json(
        { message },
        { status: 200 }
      )
    }
    const newDb = getNeonDb()

    // Ensure schema exists in Neon
    await initSchema()

    // ─── Migrate Users ────────────────────────────────────────────────
    // Note: Prisma may return columns as snake_case or camelCase depending on
    // the driver/schema, so we use fallback patterns to handle both.
    const users = await oldDb`SELECT * FROM users`
    let usersInserted = 0
    for (const user of users) {
      await newDb`
        INSERT INTO users (id, created_at, updated_at)
        VALUES (${user.id}, ${user.created_at || user.createdAt}, ${user.updated_at || user.updatedAt})
        ON CONFLICT (id) DO NOTHING
      `
      usersInserted++
    }

    // ─── Migrate Boards ───────────────────────────────────────────────
    const boards = await oldDb`SELECT * FROM boards`
    let boardsInserted = 0
    for (const board of boards) {
      const title = board.title as string
      const subtitle = board.subtitle as string | null
      const jiraBaseUrl = (board.jira_base_url || board.jiraBaseUrl) as string | null
      const jiraPat = (board.jira_pat || board.jiraPat) as string | null

      await newDb`
        INSERT INTO boards (id, title, subtitle, user_id, jira_base_url, jira_pat, created_at, updated_at)
        VALUES (
          ${board.id},
          ${encrypt(title)},
          ${encryptNullable(subtitle)},
          ${board.user_id || board.userId},
          ${encryptNullable(jiraBaseUrl)},
          ${encryptNullable(jiraPat)},
          ${board.created_at || board.createdAt},
          ${board.updated_at || board.updatedAt}
        )
        ON CONFLICT (id) DO NOTHING
      `
      boardsInserted++
    }

    // ─── Migrate Columns ──────────────────────────────────────────────
    const columns = await oldDb`SELECT * FROM columns`
    let columnsInserted = 0
    for (const col of columns) {
      await newDb`
        INSERT INTO columns (id, title, "order", color, is_start, is_end, board_id, created_at, updated_at)
        VALUES (
          ${col.id},
          ${encrypt(col.title as string)},
          ${col.order},
          ${col.color},
          ${col.is_start ?? col.isStart ?? false},
          ${col.is_end ?? col.isEnd ?? false},
          ${col.board_id || col.boardId},
          ${col.created_at || col.createdAt},
          ${col.updated_at || col.updatedAt}
        )
        ON CONFLICT (id) DO NOTHING
      `
      columnsInserted++
    }

    // ─── Migrate Tasks ────────────────────────────────────────────────
    const tasks = await oldDb`SELECT * FROM tasks`
    let tasksInserted = 0
    for (const task of tasks) {
      const images = task.images || []

      await newDb`
        INSERT INTO tasks (id, title, description, priority, "order", pinned, column_id, start_date, end_date, images, created_at, updated_at)
        VALUES (
          ${task.id},
          ${encrypt(task.title as string)},
          ${encryptNullable(task.description as string | null)},
          ${task.priority || 'medium'},
          ${task.order},
          ${task.pinned ?? false},
          ${task.column_id || task.columnId},
          ${task.start_date || task.startDate || null},
          ${task.end_date || task.endDate || null},
          ${images},
          ${task.created_at || task.createdAt},
          ${task.updated_at || task.updatedAt}
        )
        ON CONFLICT (id) DO NOTHING
      `
      tasksInserted++
    }

    // ─── Migrate SubTasks ─────────────────────────────────────────────
    const subtasks = await oldDb`SELECT * FROM subtasks`
    let subtasksInserted = 0
    for (const st of subtasks) {
      await newDb`
        INSERT INTO subtasks (id, title, done, "order", task_id, created_at, updated_at)
        VALUES (
          ${st.id},
          ${encrypt(st.title as string)},
          ${st.done ?? false},
          ${st.order},
          ${st.task_id || st.taskId},
          ${st.created_at || st.createdAt},
          ${st.updated_at || st.updatedAt}
        )
        ON CONFLICT (id) DO NOTHING
      `
      subtasksInserted++
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      migrated: {
        users: usersInserted,
        boards: boardsInserted,
        columns: columnsInserted,
        tasks: tasksInserted,
        subtasks: subtasksInserted,
      },
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Support GET for Vercel Cron
export async function GET(request: Request) {
  return POST(request)
}
