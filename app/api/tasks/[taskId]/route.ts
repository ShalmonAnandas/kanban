import { NextResponse } from 'next/server'
import { findTaskOwnedBy, updateTask as dbUpdateTask, deleteTask as dbDeleteTask } from '@/lib/db-queries'
import { getUserId } from '@/lib/session'

type Params = Promise<{ taskId: string }>

function mapTaskToCamelCase(task: NonNullable<Awaited<ReturnType<typeof findTaskOwnedBy>>>) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    order: task.order,
    pinned: task.pinned,
    columnId: task.column_id,
    startDate: task.start_date,
    endDate: task.end_date,
    images: task.images,
    videos: task.videos || [],
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { taskId } = await params
    const userId = await getUserId()
    const body = await request.json()
    
    // Verify task belongs to user
    const task = await findTaskOwnedBy(taskId, userId)
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    const updatedTask = await dbUpdateTask(taskId, {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.order !== undefined && { order: body.order }),
      ...(body.columnId !== undefined && { columnId: body.columnId }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.pinned !== undefined && { pinned: body.pinned }),
      ...(Array.isArray(body.images) && { images: body.images }),
      ...(Array.isArray(body.videos) && { videos: body.videos }),
    })
    
    return NextResponse.json(mapTaskToCamelCase(updatedTask))
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
    const task = await findTaskOwnedBy(taskId, userId)
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    await dbDeleteTask(taskId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
