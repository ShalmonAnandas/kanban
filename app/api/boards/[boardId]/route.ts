import { NextResponse } from 'next/server'
import { findBoardWithDetails, findBoardOwnedBy, deleteBoard, updateBoard } from '@/lib/db-queries'
import { getUserId } from '@/lib/session'
import { MASKED_PAT } from '@/lib/constants'
import { backfillColumnColors } from '@/lib/backfillColumnColors'

type Params = Promise<{ boardId: string }>

function mapBoardToCamelCase(board: NonNullable<Awaited<ReturnType<typeof findBoardWithDetails>>>) {
  return {
    id: board.id,
    title: board.title,
    subtitle: board.subtitle,
    userId: board.user_id,
    jiraBaseUrl: board.jira_base_url,
    jiraPat: board.jira_pat ? MASKED_PAT : null,
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
  }
}

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { boardId } = await params
    const userId = await getUserId()
    
    let board = await findBoardWithDetails(boardId, userId)
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }

    // Backfill colors for any columns that don't have one
    if (board.columns.some((c) => !c.color)) {
      await backfillColumnColors([board.id])
      board = await findBoardWithDetails(boardId, userId)
      if (!board) {
        return NextResponse.json(
          { error: 'Board not found' },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(mapBoardToCamelCase(board))
  } catch (error) {
    console.error('Error fetching board:', error)
    return NextResponse.json(
      { error: 'Failed to fetch board' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { boardId } = await params
    const userId = await getUserId()
    
    const board = await findBoardOwnedBy(boardId, userId)
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }
    
    await deleteBoard(boardId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting board:', error)
    return NextResponse.json(
      { error: 'Failed to delete board' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { boardId } = await params
    const userId = await getUserId()
    const body = await request.json()
    
    const board = await findBoardOwnedBy(boardId, userId)
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }
    
    await updateBoard(boardId, {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
      ...(body.jiraBaseUrl !== undefined && { jiraBaseUrl: body.jiraBaseUrl }),
      ...(body.jiraPat !== undefined && { jiraPat: body.jiraPat }),
    })

    const updatedBoard = await findBoardWithDetails(boardId, userId)
    if (!updatedBoard) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    return NextResponse.json(mapBoardToCamelCase(updatedBoard))
  } catch (error) {
    console.error('Error updating board:', error)
    return NextResponse.json(
      { error: 'Failed to update board' },
      { status: 500 }
    )
  }
}
