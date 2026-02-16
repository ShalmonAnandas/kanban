import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/session'

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
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        userId,
      },
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }

    // Calculate next order number
    const lastColumn = await prisma.column.findFirst({
      where: { boardId },
      orderBy: { order: 'desc' },
    })

    const column = await prisma.column.create({
      data: {
        title,
        boardId,
        order: (lastColumn?.order ?? -1) + 1,
        isStart: isStart ?? false,
        isEnd: isEnd ?? false,
      },
    })

    return NextResponse.json(column, { status: 201 })
  } catch (error) {
    console.error('Error creating column:', error)
    return NextResponse.json(
      { error: 'Failed to create column' },
      { status: 500 }
    )
  }
}
