import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
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
    const subtask = await prisma.subTask.findFirst({
      where: {
        id: subtaskId,
        task: { column: { board: { userId } } },
      },
    })

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    const updated = await prisma.subTask.update({
      where: { id: subtaskId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.done !== undefined && { done: body.done }),
        ...(body.order !== undefined && Number.isInteger(body.order) && body.order >= 0 && { order: body.order }),
      },
    })

    return NextResponse.json(updated)
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

    const subtask = await prisma.subTask.findFirst({
      where: {
        id: subtaskId,
        task: { column: { board: { userId } } },
      },
    })

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    await prisma.subTask.delete({ where: { id: subtaskId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subtask:', error)
    return NextResponse.json({ error: 'Failed to delete subtask' }, { status: 500 })
  }
}
