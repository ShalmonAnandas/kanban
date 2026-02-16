import prisma from '@/lib/prisma'
import { getUserIdFromCookie } from '@/lib/session'
import { KanbanBoard, Board } from '@/components/KanbanBoard'
import { redirect } from 'next/navigation'

const SESSION_INIT_PATH = '/api/session'

export default async function Home() {
  const userId = await getUserIdFromCookie()

  if (!userId) {
    redirect(SESSION_INIT_PATH)
  }
  
  // Get or create a default board for the user
  let boardData = await prisma.board.findFirst({
    where: { userId },
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

  // Create default board if none exists
  if (!boardData) {
    boardData = await prisma.board.create({
      data: {
        title: 'My Kanban Board',
        userId,
        columns: {
          create: [
            { title: 'To Do', order: 0 },
            { title: 'In Progress', order: 1 },
            { title: 'Done', order: 2 },
          ],
        },
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
  }

  // Serialize dates to strings for client component
  const board: Board = {
    ...boardData,
    createdAt: boardData.createdAt.toISOString(),
    updatedAt: boardData.updatedAt.toISOString(),
    columns: boardData.columns.map(col => ({
      ...col,
      createdAt: col.createdAt.toISOString(),
      updatedAt: col.updatedAt.toISOString(),
      tasks: col.tasks.map(task => ({
        ...task,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      })),
    })),
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">{board.title}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Drag and drop tasks to organize your work
          </p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6">
        <KanbanBoard initialBoard={board} />
      </main>
    </div>
  )
}
