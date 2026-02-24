import { NextResponse } from 'next/server'
import { findColumnOwnedBy, getLastTaskOrder, createTask as dbCreateTask } from '@/lib/db-queries'
import { getUserId } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const { title, description, columnId, priority, images } = await request.json()
    
    if (!title || !columnId) {
      return NextResponse.json(
        { error: 'Title and columnId are required' },
        { status: 400 }
      )
    }
    
    // Handle #jira prefix for bulk ticket creation
    // Note: JIRA fetching is now done client-side to support Zscaler
    if (title.startsWith('#jira ')) {
      return NextResponse.json(
        { error: 'JIRA integration is handled client-side. This endpoint should not receive #jira prefixed titles.' },
        { status: 400 }
      )
    }
    
    // Verify column belongs to user
    const column = await findColumnOwnedBy(columnId, userId)
    
    if (!column) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      )
    }

    const lastOrder = await getLastTaskOrder(columnId)
    
    const task = await dbCreateTask({
      title,
      description: description || null,
      columnId,
      priority: priority || 'medium',
      order: lastOrder + 1,
      ...(column.is_start && { startDate: new Date() }),
      ...(Array.isArray(images) && { images }),
    })

    // Map to camelCase
    return NextResponse.json({
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
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
