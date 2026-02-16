import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
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

    const column = await prisma.column.findFirst({
      where: {
        id: columnId,
        board: { userId },
      },
    })

    if (!column) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      )
    }

    const updatedColumn = await prisma.column.update({
      where: { id: columnId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.isStart !== undefined && { isStart: body.isStart }),
        ...(body.isEnd !== undefined && { isEnd: body.isEnd }),
      },
    })

    return NextResponse.json(updatedColumn)
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

    const column = await prisma.column.findFirst({
      where: {
        id: columnId,
        board: { userId },
      },
    })

    if (!column) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      )
    }

    await prisma.column.delete({
      where: { id: columnId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting column:', error)
    return NextResponse.json(
      { error: 'Failed to delete column' },
      { status: 500 }
    )
  }
}
