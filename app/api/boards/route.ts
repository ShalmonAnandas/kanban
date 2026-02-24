import { NextResponse } from 'next/server'
import { findBoardsByUserId, createBoard } from '@/lib/db-queries'
import { getUserId } from '@/lib/session'
import { backfillColumnColors } from '@/lib/backfillColumnColors'

export async function GET() {
  try {
    const userId = await getUserId()
    
    let boards = await findBoardsByUserId(userId)

    // Backfill colors for any columns that don't have one
    const boardsWithMissing = boards.filter((b) =>
      b.columns.some((c) => !c.color)
    )
    if (boardsWithMissing.length > 0) {
      await backfillColumnColors(boardsWithMissing.map((b) => b.id))
      boards = await findBoardsByUserId(userId)
    }
    
    // Map to camelCase for client compatibility
    const result = boards.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      userId: b.user_id,
      jiraBaseUrl: b.jira_base_url,
      jiraPat: b.jira_pat,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      columns: b.columns.map((c) => ({
        id: c.id,
        title: c.title,
        order: c.order,
        color: c.color,
        isStart: c.is_start,
        isEnd: c.is_end,
        boardId: c.board_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        tasks: c.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          order: t.order,
          pinned: t.pinned,
          columnId: t.column_id,
          startDate: t.start_date,
          endDate: t.end_date,
          images: t.images,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        })),
      })),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching boards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch boards' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const { title } = await request.json()
    
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }
    
    const board = await createBoard(title, userId, [
      { title: 'To Do', order: 0, isStart: true },
      { title: 'In Progress', order: 1 },
      { title: 'Done', order: 2, isEnd: true },
    ])

    // Map to camelCase
    const result = {
      id: board.id,
      title: board.title,
      subtitle: board.subtitle,
      userId: board.user_id,
      createdAt: board.created_at,
      updatedAt: board.updated_at,
      columns: board.columns.map((c) => ({
        id: c.id,
        title: c.title,
        order: c.order,
        color: c.color,
        isStart: c.is_start,
        isEnd: c.is_end,
        boardId: c.board_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        tasks: c.tasks,
      })),
    }
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating board:', error)
    return NextResponse.json(
      { error: 'Failed to create board' },
      { status: 500 }
    )
  }
}
