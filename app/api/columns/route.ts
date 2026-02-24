import { NextResponse } from 'next/server'
import { findBoardOwnedBy, getLastColumnOrder, createColumn as dbCreateColumn } from '@/lib/db-queries'
import { getUserId } from '@/lib/session'
import { getRandomPastelColor } from '@/lib/colors'

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const { boardId, title, isStart, isEnd } = await request.json()

    if (!boardId || !title) {
      return NextResponse.json(
        { error: 'boardId and title are required' },
        { status: 400 }
      )
    }

    // Verify board belongs to user
    const board = await findBoardOwnedBy(boardId, userId)

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }

    // Calculate next order number
    const lastOrder = await getLastColumnOrder(boardId)

    const column = await dbCreateColumn({
      title,
      boardId,
      order: lastOrder + 1,
      isStart: isStart ?? false,
      isEnd: isEnd ?? false,
      color: getRandomPastelColor(),
    })

    // Map to camelCase
    return NextResponse.json({
      id: column.id,
      title: column.title,
      order: column.order,
      color: column.color,
      isStart: column.is_start,
      isEnd: column.is_end,
      boardId: column.board_id,
      createdAt: column.created_at,
      updatedAt: column.updated_at,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating column:', error)
    return NextResponse.json(
      { error: 'Failed to create column' },
      { status: 500 }
    )
  }
}
