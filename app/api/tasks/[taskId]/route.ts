import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/session'

type Params = Promise<{ taskId: string }>

export async function PATCH(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { taskId } = await params
    const userId = await getUserId()
    const body = await request.json()
    
    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        column: {
          board: {
            userId,
          },
        },
      },
    })
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.columnId !== undefined && { columnId: body.columnId }),
        ...(body.priority !== undefined && { priority: body.priority }),
      },
    })
    
    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { taskId } = await params
    const userId = await getUserId()
    
    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        column: {
          board: {
            userId,
          },
        },
      },
    })
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    await prisma.task.delete({
      where: { id: taskId },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
