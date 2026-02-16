import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/session'

type Params = Promise<{ boardId: string }>

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { boardId } = await params
    const userId = await getUserId()
    
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        userId,
      },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(board)
  } catch (error) {
    console.error('Error fetching board:', error)
    return NextResponse.json(
      { error: 'Failed to fetch board' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { boardId } = await params
    const userId = await getUserId()
    
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
    
    await prisma.board.delete({
      where: { id: boardId },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting board:', error)
    return NextResponse.json(
      { error: 'Failed to delete board' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { boardId } = await params
    const userId = await getUserId()
    const { title } = await request.json()
    
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
    
    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: { title },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })
    
    return NextResponse.json(updatedBoard)
  } catch (error) {
    console.error('Error updating board:', error)
    return NextResponse.json(
      { error: 'Failed to update board' },
      { status: 500 }
    )
  }
}
