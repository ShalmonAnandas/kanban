'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'

export type Task = {
  id: string
  title: string
  description: string | null
  order: number
  columnId: string
  createdAt: string
  updatedAt: string
}

export type Column = {
  id: string
  title: string
  order: number
  boardId: string
  tasks: Task[]
  createdAt: string
  updatedAt: string
}

export type Board = {
  id: string
  title: string
  userId: string
  columns: Column[]
  createdAt: string
  updatedAt: string
}

type KanbanBoardProps = {
  initialBoard: Board
}

export function KanbanBoard({ initialBoard }: KanbanBoardProps) {
  const [board, setBoard] = useState<Board>(initialBoard)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    setBoard(initialBoard)
  }, [initialBoard])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = board.columns
      .flatMap((col) => col.tasks)
      .find((t) => t.id === active.id)
    setActiveTask(task || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    // Find columns
    const activeColumn = board.columns.find((col) =>
      col.tasks.some((task) => task.id === activeId)
    )
    const overColumn = board.columns.find(
      (col) => col.id === overId || col.tasks.some((task) => task.id === overId)
    )

    if (!activeColumn || !overColumn) return

    // Optimistic update
    setBoard((prevBoard) => {
      const newBoard = { ...prevBoard }
      const newColumns = [...newBoard.columns]

      const activeColIndex = newColumns.findIndex(
        (col) => col.id === activeColumn.id
      )
      const overColIndex = newColumns.findIndex(
        (col) => col.id === overColumn.id
      )

      const activeTaskIndex = newColumns[activeColIndex].tasks.findIndex(
        (task) => task.id === activeId
      )
      const activeTask = newColumns[activeColIndex].tasks[activeTaskIndex]

      // Remove from active column
      newColumns[activeColIndex] = {
        ...newColumns[activeColIndex],
        tasks: newColumns[activeColIndex].tasks.filter(
          (task) => task.id !== activeId
        ),
      }

      // Add to over column
      let overTaskIndex = newColumns[overColIndex].tasks.findIndex(
        (task) => task.id === overId
      )

      if (overTaskIndex === -1) {
        // Dropped on column itself
        overTaskIndex = newColumns[overColIndex].tasks.length
      }

      newColumns[overColIndex] = {
        ...newColumns[overColIndex],
        tasks: [
          ...newColumns[overColIndex].tasks.slice(0, overTaskIndex),
          { ...activeTask, columnId: overColumn.id },
          ...newColumns[overColIndex].tasks.slice(overTaskIndex),
        ],
      }

      // Reorder tasks
      newColumns[activeColIndex].tasks = newColumns[activeColIndex].tasks.map(
        (task, idx) => ({ ...task, order: idx })
      )
      newColumns[overColIndex].tasks = newColumns[overColIndex].tasks.map(
        (task, idx) => ({ ...task, order: idx })
      )

      return { ...newBoard, columns: newColumns }
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeColumn = board.columns.find((col) =>
      col.tasks.some((task) => task.id === activeId)
    )
    const overColumn = board.columns.find(
      (col) => col.id === overId || col.tasks.some((task) => task.id === overId)
    )

    if (!activeColumn || !overColumn) return

    const activeTaskIndex = activeColumn.tasks.findIndex(
      (task) => task.id === activeId
    )
    let overTaskIndex = overColumn.tasks.findIndex((task) => task.id === overId)

    if (overTaskIndex === -1) {
      overTaskIndex = overColumn.tasks.length
    }

    // Persist to backend
    try {
      const response = await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: activeId,
          columnId: overColumn.id,
          newOrder: overTaskIndex,
        }),
      })

      if (response.ok) {
        const updatedBoard = await response.json()
        setBoard(updatedBoard)
      }
    } catch (error) {
      console.error('Failed to reorder task:', error)
    }
  }

  const handleCreateTask = async (columnId: string, title: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          columnId,
        }),
      })

      if (response.ok) {
        const newTask = await response.json()
        setBoard((prevBoard) => {
          const newColumns = prevBoard.columns.map((col) => {
            if (col.id === columnId) {
              return {
                ...col,
                tasks: [...col.tasks, newTask],
              }
            }
            return col
          })
          return { ...prevBoard, columns: newColumns }
        })
      }
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setBoard((prevBoard) => {
          const newColumns = prevBoard.columns.map((col) => ({
            ...col,
            tasks: col.tasks.filter((task) => task.id !== taskId),
          }))
          return { ...prevBoard, columns: newColumns }
        })
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-4">
        {board.columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            onCreateTask={handleCreateTask}
            onDeleteTask={handleDeleteTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
