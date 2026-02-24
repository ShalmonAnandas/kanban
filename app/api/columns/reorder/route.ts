import { NextResponse } from 'next/server'
import { findBoardOwnedBy, findColumnsByBoardIdAndIds, setColumnOrder } from '@/lib/db-queries'
import { getUserId } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const { boardId, columnIds } = await request.json()

    if (!boardId || !Array.isArray(columnIds) || columnIds.length === 0) {
      return NextResponse.json(
        { error: 'boardId and columnIds array are required' },
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

    // Verify all columns belong to this board
    const columns = await findColumnsByBoardIdAndIds(boardId, columnIds)

    if (columns.length !== columnIds.length) {
      return NextResponse.json(
        { error: 'Some columns not found in this board' },
        { status: 400 }
      )
    }

    // Update all column orders
    await Promise.all(
      columnIds.map((id: string, index: number) =>
        setColumnOrder(id, index)
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering columns:', error)
    return NextResponse.json(
      { error: 'Failed to reorder columns' },
      { status: 500 }
    )
  }
}
