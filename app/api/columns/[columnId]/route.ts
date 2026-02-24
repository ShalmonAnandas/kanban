import { NextResponse } from 'next/server'
import { findColumnOwnedBy, updateColumn as dbUpdateColumn, deleteColumn as dbDeleteColumn } from '@/lib/db-queries'
import { getUserId } from '@/lib/session'

type Params = Promise<{ columnId: string }>

export async function PATCH(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { columnId } = await params
    const userId = await getUserId()
    const body = await request.json()

    const column = await findColumnOwnedBy(columnId, userId)

    if (!column) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      )
    }

    const updatedColumn = await dbUpdateColumn(columnId, {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.isStart !== undefined && { isStart: body.isStart }),
      ...(body.isEnd !== undefined && { isEnd: body.isEnd }),
      ...(body.color !== undefined && { color: body.color }),
    })

    // Map to camelCase
    return NextResponse.json({
      id: updatedColumn.id,
      title: updatedColumn.title,
      order: updatedColumn.order,
      color: updatedColumn.color,
      isStart: updatedColumn.is_start,
      isEnd: updatedColumn.is_end,
      boardId: updatedColumn.board_id,
      createdAt: updatedColumn.created_at,
      updatedAt: updatedColumn.updated_at,
    })
  } catch (error) {
    console.error('Error updating column:', error)
    return NextResponse.json(
      { error: 'Failed to update column' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { columnId } = await params
    const userId = await getUserId()

    const column = await findColumnOwnedBy(columnId, userId)

    if (!column) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      )
    }

    await dbDeleteColumn(columnId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting column:', error)
    return NextResponse.json(
      { error: 'Failed to delete column' },
      { status: 500 }
    )
  }
}
