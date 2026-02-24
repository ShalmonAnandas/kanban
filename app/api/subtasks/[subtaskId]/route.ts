import { NextResponse } from 'next/server'
import { findSubtaskOwnedBy, updateSubtask as dbUpdateSubtask, deleteSubtask as dbDeleteSubtask } from '@/lib/db-queries'
import { getUserId } from '@/lib/session'

type Params = Promise<{ subtaskId: string }>

export async function PATCH(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { subtaskId } = await params
    const userId = await getUserId()
    const body = await request.json()

    // Verify subtask belongs to user
    const subtask = await findSubtaskOwnedBy(subtaskId, userId)

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    const updated = await dbUpdateSubtask(subtaskId, {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.done !== undefined && { done: body.done }),
      ...(body.order !== undefined && Number.isInteger(body.order) && body.order >= 0 && { order: body.order }),
    })

    // Map to camelCase
    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      done: updated.done,
      order: updated.order,
      taskId: updated.task_id,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    })
  } catch (error) {
    console.error('Error updating subtask:', error)
    return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { subtaskId } = await params
    const userId = await getUserId()

    const subtask = await findSubtaskOwnedBy(subtaskId, userId)

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    await dbDeleteSubtask(subtaskId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subtask:', error)
    return NextResponse.json({ error: 'Failed to delete subtask' }, { status: 500 })
  }
}
