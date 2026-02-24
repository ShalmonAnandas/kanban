import sql from './db'

/**
 * Initialize the Neon database schema.
 * Creates tables if they don't exist - safe to call on every cold start.
 */
export async function initSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      jira_base_url TEXT,
      jira_pat TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      "order" INT NOT NULL,
      color TEXT,
      is_start BOOLEAN NOT NULL DEFAULT FALSE,
      is_end BOOLEAN NOT NULL DEFAULT FALSE,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      "order" INT NOT NULL,
      pinned BOOLEAN NOT NULL DEFAULT FALSE,
      column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      images TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      "order" INT NOT NULL,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id)
  `
}
