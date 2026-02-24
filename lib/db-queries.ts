import sql from './db'
import { createId } from '@paralleldrive/cuid2'
import { encrypt, decrypt, encryptNullable, decryptNullable } from './encryption'

// ─── Types ───────────────────────────────────────────────────────────────────

export type DbUser = {
  id: string
  created_at: string
  updated_at: string
}

export type DbBoard = {
  id: string
  title: string
  subtitle: string | null
  user_id: string
  jira_base_url: string | null
  jira_pat: string | null
  created_at: string
  updated_at: string
}

export type DbColumn = {
  id: string
  title: string
  order: number
  color: string | null
  is_start: boolean
  is_end: boolean
  board_id: string
  created_at: string
  updated_at: string
}

export type DbTask = {
  id: string
  title: string
  description: string | null
  priority: string
  order: number
  pinned: boolean
  column_id: string
  start_date: string | null
  end_date: string | null
  images: string[]
  created_at: string
  updated_at: string
}

export type DbSubTask = {
  id: string
  title: string
  done: boolean
  order: number
  task_id: string
  created_at: string
  updated_at: string
}

// ─── Decryption helpers ─────────────────────────────────────────────────────

function decryptBoard(row: DbBoard): DbBoard {
  return {
    ...row,
    title: decrypt(row.title),
    subtitle: decryptNullable(row.subtitle),
    jira_base_url: decryptNullable(row.jira_base_url),
    jira_pat: decryptNullable(row.jira_pat),
  }
}

function decryptColumn(row: DbColumn): DbColumn {
  return { ...row, title: decrypt(row.title) }
}

function decryptTask(row: DbTask): DbTask {
  return {
    ...row,
    title: decrypt(row.title),
    description: decryptNullable(row.description),
  }
}

function decryptSubTask(row: DbSubTask): DbSubTask {
  return { ...row, title: decrypt(row.title) }
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function createUser(id?: string): Promise<DbUser> {
  const userId = id || createId()
  const now = new Date().toISOString()
  const rows = await sql`
    INSERT INTO users (id, created_at, updated_at)
    VALUES (${userId}, ${now}, ${now})
    RETURNING *
  `
  return rows[0] as DbUser
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const rows = await sql`SELECT * FROM users WHERE id = ${id}`
  return (rows[0] as DbUser) || null
}

// ─── Boards ─────────────────────────────────────────────────────────────────

export async function findBoardsByUserId(userId: string) {
  const boards = await sql`
    SELECT * FROM boards WHERE user_id = ${userId} ORDER BY created_at DESC
  ` as DbBoard[]

  const result = []
  for (const board of boards) {
    const columns = await findColumnsByBoardId(board.id)
    const columnsWithTasks = await Promise.all(
      columns.map(async (col) => {
        const tasks = await findTasksByColumnId(col.id)
        return { ...col, tasks }
      })
    )
    result.push({ ...decryptBoard(board), columns: columnsWithTasks })
  }
  return result
}

export async function findBoardWithDetails(boardId: string, userId: string) {
  const rows = await sql`
    SELECT * FROM boards WHERE id = ${boardId} AND user_id = ${userId}
  ` as DbBoard[]
  if (!rows[0]) return null

  const board = decryptBoard(rows[0])
  const columns = await findColumnsByBoardId(boardId)
  const columnsWithTasks = await Promise.all(
    columns.map(async (col) => {
      const tasks = await findTasksByColumnId(col.id)
      return { ...col, tasks }
    })
  )
  return { ...board, columns: columnsWithTasks }
}

export async function findBoardFirstByUserId(userId: string) {
  const rows = await sql`
    SELECT * FROM boards WHERE user_id = ${userId} ORDER BY created_at ASC LIMIT 1
  ` as DbBoard[]
  if (!rows[0]) return null

  const board = decryptBoard(rows[0])
  const columns = await findColumnsByBoardId(board.id)
  const columnsWithTasksAndSubtasks = await Promise.all(
    columns.map(async (col) => {
      const tasks = await findTasksByColumnIdWithSubtasks(col.id)
      return { ...col, tasks }
    })
  )
  return { ...board, columns: columnsWithTasksAndSubtasks }
}

export async function findBoardOwnedBy(boardId: string, userId: string): Promise<DbBoard | null> {
  const rows = await sql`
    SELECT * FROM boards WHERE id = ${boardId} AND user_id = ${userId}
  ` as DbBoard[]
  return rows[0] ? decryptBoard(rows[0]) : null
}

export async function createBoard(
  title: string,
  userId: string,
  defaultColumns: { title: string; order: number; isStart?: boolean; isEnd?: boolean; color?: string }[]
) {
  const boardId = createId()
  const now = new Date().toISOString()

  await sql`
    INSERT INTO boards (id, title, user_id, created_at, updated_at)
    VALUES (${boardId}, ${encrypt(title)}, ${userId}, ${now}, ${now})
  `

  const columns = []
  for (const col of defaultColumns) {
    const colId = createId()
    await sql`
      INSERT INTO columns (id, title, "order", color, is_start, is_end, board_id, created_at, updated_at)
      VALUES (${colId}, ${encrypt(col.title)}, ${col.order}, ${col.color || null}, ${col.isStart || false}, ${col.isEnd || false}, ${boardId}, ${now}, ${now})
    `
    columns.push({
      id: colId,
      title: col.title,
      order: col.order,
      color: col.color || null,
      is_start: col.isStart || false,
      is_end: col.isEnd || false,
      board_id: boardId,
      created_at: now,
      updated_at: now,
      tasks: [],
    })
  }

  return {
    id: boardId,
    title,
    subtitle: null,
    user_id: userId,
    jira_base_url: null,
    jira_pat: null,
    created_at: now,
    updated_at: now,
    columns,
  }
}

export async function updateBoard(boardId: string, data: {
  title?: string
  subtitle?: string
  jiraBaseUrl?: string
  jiraPat?: string
}) {
  const now = new Date().toISOString()

  // Build update dynamically
  if (data.title !== undefined) {
    await sql`UPDATE boards SET title = ${encrypt(data.title)}, updated_at = ${now} WHERE id = ${boardId}`
  }
  if (data.subtitle !== undefined) {
    await sql`UPDATE boards SET subtitle = ${encryptNullable(data.subtitle)}, updated_at = ${now} WHERE id = ${boardId}`
  }
  if (data.jiraBaseUrl !== undefined) {
    await sql`UPDATE boards SET jira_base_url = ${encryptNullable(data.jiraBaseUrl)}, updated_at = ${now} WHERE id = ${boardId}`
  }
  if (data.jiraPat !== undefined) {
    await sql`UPDATE boards SET jira_pat = ${encryptNullable(data.jiraPat)}, updated_at = ${now} WHERE id = ${boardId}`
  }
}

export async function deleteBoard(boardId: string): Promise<void> {
  await sql`DELETE FROM boards WHERE id = ${boardId}`
}

// ─── Columns ────────────────────────────────────────────────────────────────

export async function findColumnsByBoardId(boardId: string): Promise<DbColumn[]> {
  const rows = await sql`
    SELECT * FROM columns WHERE board_id = ${boardId} ORDER BY "order" ASC
  ` as DbColumn[]
  return rows.map(decryptColumn)
}

export async function findColumnOwnedBy(columnId: string, userId: string): Promise<DbColumn | null> {
  const rows = await sql`
    SELECT c.* FROM columns c
    JOIN boards b ON c.board_id = b.id
    WHERE c.id = ${columnId} AND b.user_id = ${userId}
  ` as DbColumn[]
  return rows[0] ? decryptColumn(rows[0]) : null
}

export async function findColumnById(columnId: string): Promise<DbColumn | null> {
  const rows = await sql`SELECT * FROM columns WHERE id = ${columnId}` as DbColumn[]
  return rows[0] ? decryptColumn(rows[0]) : null
}

export async function createColumn(data: {
  title: string
  boardId: string
  order: number
  isStart?: boolean
  isEnd?: boolean
  color?: string
}) {
  const id = createId()
  const now = new Date().toISOString()
  const rows = await sql`
    INSERT INTO columns (id, title, "order", color, is_start, is_end, board_id, created_at, updated_at)
    VALUES (${id}, ${encrypt(data.title)}, ${data.order}, ${data.color || null}, ${data.isStart || false}, ${data.isEnd || false}, ${data.boardId}, ${now}, ${now})
    RETURNING *
  ` as DbColumn[]
  return decryptColumn(rows[0])
}

export async function updateColumn(columnId: string, data: {
  title?: string
  isStart?: boolean
  isEnd?: boolean
  color?: string
}) {
  const now = new Date().toISOString()
  if (data.title !== undefined) {
    await sql`UPDATE columns SET title = ${encrypt(data.title)}, updated_at = ${now} WHERE id = ${columnId}`
  }
  if (data.isStart !== undefined) {
    await sql`UPDATE columns SET is_start = ${data.isStart}, updated_at = ${now} WHERE id = ${columnId}`
  }
  if (data.isEnd !== undefined) {
    await sql`UPDATE columns SET is_end = ${data.isEnd}, updated_at = ${now} WHERE id = ${columnId}`
  }
  if (data.color !== undefined) {
    await sql`UPDATE columns SET color = ${data.color}, updated_at = ${now} WHERE id = ${columnId}`
  }

  const rows = await sql`SELECT * FROM columns WHERE id = ${columnId}` as DbColumn[]
  return decryptColumn(rows[0])
}

export async function deleteColumn(columnId: string): Promise<void> {
  await sql`DELETE FROM columns WHERE id = ${columnId}`
}

export async function getLastColumnOrder(boardId: string): Promise<number> {
  const rows = await sql`
    SELECT "order" FROM columns WHERE board_id = ${boardId} ORDER BY "order" DESC LIMIT 1
  `
  return rows[0] ? (rows[0].order as number) : -1
}

export async function findColumnsWithoutColor(boardIds: string[]): Promise<{ id: string }[]> {
  const rows = await sql`
    SELECT id FROM columns WHERE board_id = ANY(${boardIds}) AND color IS NULL
  `
  return rows as { id: string }[]
}

export async function setColumnColor(columnId: string, color: string): Promise<void> {
  await sql`UPDATE columns SET color = ${color} WHERE id = ${columnId}`
}

export async function findColumnsByBoardIdAndIds(boardId: string, columnIds: string[]): Promise<DbColumn[]> {
  const rows = await sql`
    SELECT * FROM columns WHERE board_id = ${boardId} AND id = ANY(${columnIds})
  ` as DbColumn[]
  return rows.map(decryptColumn)
}

export async function setColumnOrder(columnId: string, order: number): Promise<void> {
  const now = new Date().toISOString()
  await sql`UPDATE columns SET "order" = ${order}, updated_at = ${now} WHERE id = ${columnId}`
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

export async function findTasksByColumnId(columnId: string): Promise<DbTask[]> {
  const rows = await sql`
    SELECT * FROM tasks WHERE column_id = ${columnId} ORDER BY "order" ASC
  ` as DbTask[]
  return rows.map(decryptTask)
}

export async function findTasksByColumnIdWithSubtasks(columnId: string) {
  const tasks = await findTasksByColumnId(columnId)
  return Promise.all(
    tasks.map(async (task) => {
      const subtasks = await findSubtasksByTaskId(task.id)
      return { ...task, subtasks }
    })
  )
}

export async function findTaskOwnedBy(taskId: string, userId: string): Promise<DbTask | null> {
  const rows = await sql`
    SELECT t.* FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN boards b ON c.board_id = b.id
    WHERE t.id = ${taskId} AND b.user_id = ${userId}
  ` as DbTask[]
  return rows[0] ? decryptTask(rows[0]) : null
}

export async function getLastTaskOrder(columnId: string): Promise<number> {
  const rows = await sql`
    SELECT "order" FROM tasks WHERE column_id = ${columnId} ORDER BY "order" DESC LIMIT 1
  `
  return rows[0] ? (rows[0].order as number) : -1
}

export async function createTask(data: {
  title: string
  description?: string | null
  columnId: string
  priority?: string
  order: number
  startDate?: Date
  images?: string[]
}) {
  const id = createId()
  const now = new Date().toISOString()
  const rows = await sql`
    INSERT INTO tasks (id, title, description, priority, "order", column_id, start_date, images, created_at, updated_at)
    VALUES (
      ${id},
      ${encrypt(data.title)},
      ${encryptNullable(data.description ?? null)},
      ${data.priority || 'medium'},
      ${data.order},
      ${data.columnId},
      ${data.startDate ? data.startDate.toISOString() : null},
      ${data.images || []},
      ${now},
      ${now}
    )
    RETURNING *
  ` as DbTask[]
  return decryptTask(rows[0])
}

export async function updateTask(taskId: string, data: {
  title?: string
  description?: string
  order?: number
  columnId?: string
  priority?: string
  pinned?: boolean
  images?: string[]
  startDate?: Date | null
  endDate?: Date | null
}) {
  const now = new Date().toISOString()

  if (data.title !== undefined) {
    await sql`UPDATE tasks SET title = ${encrypt(data.title)}, updated_at = ${now} WHERE id = ${taskId}`
  }
  if (data.description !== undefined) {
    await sql`UPDATE tasks SET description = ${encryptNullable(data.description)}, updated_at = ${now} WHERE id = ${taskId}`
  }
  if (data.order !== undefined) {
    await sql`UPDATE tasks SET "order" = ${data.order}, updated_at = ${now} WHERE id = ${taskId}`
  }
  if (data.columnId !== undefined) {
    await sql`UPDATE tasks SET column_id = ${data.columnId}, updated_at = ${now} WHERE id = ${taskId}`
  }
  if (data.priority !== undefined) {
    await sql`UPDATE tasks SET priority = ${data.priority}, updated_at = ${now} WHERE id = ${taskId}`
  }
  if (data.pinned !== undefined) {
    await sql`UPDATE tasks SET pinned = ${data.pinned}, updated_at = ${now} WHERE id = ${taskId}`
  }
  if (data.images !== undefined) {
    await sql`UPDATE tasks SET images = ${data.images}, updated_at = ${now} WHERE id = ${taskId}`
  }
  if (data.startDate !== undefined) {
    await sql`UPDATE tasks SET start_date = ${data.startDate ? data.startDate.toISOString() : null}, updated_at = ${now} WHERE id = ${taskId}`
  }
  if (data.endDate !== undefined) {
    await sql`UPDATE tasks SET end_date = ${data.endDate ? data.endDate.toISOString() : null}, updated_at = ${now} WHERE id = ${taskId}`
  }

  const rows = await sql`SELECT * FROM tasks WHERE id = ${taskId}` as DbTask[]
  return decryptTask(rows[0])
}

export async function deleteTask(taskId: string): Promise<void> {
  await sql`DELETE FROM tasks WHERE id = ${taskId}`
}

// Task reorder helpers
export async function decrementTaskOrders(columnId: string, gtOrder: number, lteOrder: number): Promise<void> {
  await sql`
    UPDATE tasks SET "order" = "order" - 1
    WHERE column_id = ${columnId} AND "order" > ${gtOrder} AND "order" <= ${lteOrder}
  `
}

export async function incrementTaskOrders(columnId: string, gteOrder: number, ltOrder: number): Promise<void> {
  await sql`
    UPDATE tasks SET "order" = "order" + 1
    WHERE column_id = ${columnId} AND "order" >= ${gteOrder} AND "order" < ${ltOrder}
  `
}

export async function decrementTaskOrdersAbove(columnId: string, gtOrder: number): Promise<void> {
  await sql`
    UPDATE tasks SET "order" = "order" - 1
    WHERE column_id = ${columnId} AND "order" > ${gtOrder}
  `
}

export async function incrementTaskOrdersAbove(columnId: string, gteOrder: number): Promise<void> {
  await sql`
    UPDATE tasks SET "order" = "order" + 1
    WHERE column_id = ${columnId} AND "order" >= ${gteOrder}
  `
}

export async function moveTask(taskId: string, columnId: string, order: number, dateUpdates: {
  startDate?: Date
  endDate?: Date | null
}): Promise<DbTask> {
  const now = new Date().toISOString()

  // Build updates for move
  await sql`
    UPDATE tasks SET column_id = ${columnId}, "order" = ${order}, updated_at = ${now}
    WHERE id = ${taskId}
  `

  if (dateUpdates.startDate !== undefined) {
    await sql`UPDATE tasks SET start_date = ${dateUpdates.startDate.toISOString()} WHERE id = ${taskId}`
  }
  if (dateUpdates.endDate !== undefined) {
    await sql`UPDATE tasks SET end_date = ${dateUpdates.endDate ? dateUpdates.endDate.toISOString() : null} WHERE id = ${taskId}`
  }

  const rows = await sql`SELECT * FROM tasks WHERE id = ${taskId}` as DbTask[]
  return decryptTask(rows[0])
}

// ─── SubTasks ───────────────────────────────────────────────────────────────

export async function findSubtasksByTaskId(taskId: string): Promise<DbSubTask[]> {
  const rows = await sql`
    SELECT * FROM subtasks WHERE task_id = ${taskId} ORDER BY "order" ASC
  ` as DbSubTask[]
  return rows.map(decryptSubTask)
}

export async function findSubtaskOwnedBy(subtaskId: string, userId: string): Promise<DbSubTask | null> {
  const rows = await sql`
    SELECT s.* FROM subtasks s
    JOIN tasks t ON s.task_id = t.id
    JOIN columns c ON t.column_id = c.id
    JOIN boards b ON c.board_id = b.id
    WHERE s.id = ${subtaskId} AND b.user_id = ${userId}
  ` as DbSubTask[]
  return rows[0] ? decryptSubTask(rows[0]) : null
}

export async function createSubtask(data: {
  title: string
  taskId: string
  order: number
}) {
  const id = createId()
  const now = new Date().toISOString()
  const rows = await sql`
    INSERT INTO subtasks (id, title, task_id, "order", created_at, updated_at)
    VALUES (${id}, ${encrypt(data.title)}, ${data.taskId}, ${data.order}, ${now}, ${now})
    RETURNING *
  ` as DbSubTask[]
  return decryptSubTask(rows[0])
}

export async function updateSubtask(subtaskId: string, data: {
  title?: string
  done?: boolean
  order?: number
}) {
  const now = new Date().toISOString()
  if (data.title !== undefined) {
    await sql`UPDATE subtasks SET title = ${encrypt(data.title)}, updated_at = ${now} WHERE id = ${subtaskId}`
  }
  if (data.done !== undefined) {
    await sql`UPDATE subtasks SET done = ${data.done}, updated_at = ${now} WHERE id = ${subtaskId}`
  }
  if (data.order !== undefined) {
    await sql`UPDATE subtasks SET "order" = ${data.order}, updated_at = ${now} WHERE id = ${subtaskId}`
  }

  const rows = await sql`SELECT * FROM subtasks WHERE id = ${subtaskId}` as DbSubTask[]
  return decryptSubTask(rows[0])
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  await sql`DELETE FROM subtasks WHERE id = ${subtaskId}`
}

export async function getLastSubtaskOrder(taskId: string): Promise<number> {
  const rows = await sql`
    SELECT "order" FROM subtasks WHERE task_id = ${taskId} ORDER BY "order" DESC LIMIT 1
  `
  return rows[0] ? (rows[0].order as number) : -1
}
