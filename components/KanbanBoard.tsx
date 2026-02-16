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
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'

export type Task = {
  id: string
  title: string
  description: string | null
  priority: string
  order: number
  columnId: string
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
}

export type Column = {
  id: string
  title: string
  order: number
  isStart: boolean
  isEnd: boolean
  boardId: string
  tasks: Task[]
  createdAt: string
  updatedAt: string
}

export type Board = {
  id: string
  title: string
  userId: string
  jiraBaseUrl: string | null
  columns: Column[]
  createdAt: string
  updatedAt: string
}

type KanbanBoardProps = {
  initialBoard: Board
}

// Normalize date fields from API responses to ISO strings.
// API may return Date objects or raw strings; this ensures consistent string types.
function serializeBoardDates(raw: Board): Board {
  return {
    ...raw,
    columns: raw.columns.map((col) => ({
      ...col,
      tasks: col.tasks.map((t) => ({
        ...t,
        startDate: t.startDate ? String(t.startDate) : null,
        endDate: t.endDate ? String(t.endDate) : null,
        createdAt: String(t.createdAt),
        updatedAt: String(t.updatedAt),
      })),
    })),
  }
}

export function KanbanBoard({ initialBoard }: KanbanBoardProps) {
  const [board, setBoard] = useState<Board>(initialBoard)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  // Board settings
  const [showBoardSettings, setShowBoardSettings] = useState(false)
  const [jiraUrlInput, setJiraUrlInput] = useState(initialBoard.jiraBaseUrl || '')
  const [savingJira, setSavingJira] = useState(false)

  // Add column
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColTitle, setNewColTitle] = useState('')
  const [newColIsStart, setNewColIsStart] = useState(false)
  const [newColIsEnd, setNewColIsEnd] = useState(false)

  // Task detail modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriority, setEditPriority] = useState('medium')
  const [savingTask, setSavingTask] = useState(false)

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

  // Open task detail modal
  const openTaskModal = (task: Task) => {
    setSelectedTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description || '')
    setEditPriority(task.priority)
  }

  const closeTaskModal = () => {
    setSelectedTask(null)
  }

  const handleSaveTask = async () => {
    if (!selectedTask) return
    setSavingTask(true)
    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription || null,
          priority: editPriority,
        }),
      })
      if (response.ok) {
        const updatedTask: Task = await response.json()
        setBoard((prev) => ({
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            tasks: col.tasks.map((t) =>
              t.id === updatedTask.id
                ? {
                    ...updatedTask,
                    startDate: updatedTask.startDate ? String(updatedTask.startDate) : null,
                    endDate: updatedTask.endDate ? String(updatedTask.endDate) : null,
                    createdAt: String(updatedTask.createdAt),
                    updatedAt: String(updatedTask.updatedAt),
                  }
                : t
            ),
          })),
        }))
        setSelectedTask(null)
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    } finally {
      setSavingTask(false)
    }
  }

  // Board settings: save JIRA URL
  const handleSaveJiraUrl = async () => {
    setSavingJira(true)
    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jiraBaseUrl: jiraUrlInput || null }),
      })
      if (response.ok) {
        const updated = await response.json()
        setBoard((prev) => ({ ...prev, jiraBaseUrl: updated.jiraBaseUrl ?? null }))
        setShowBoardSettings(false)
      }
    } catch (error) {
      console.error('Failed to save board settings:', error)
    } finally {
      setSavingJira(false)
    }
  }

  // Add column
  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newColTitle.trim()) return
    try {
      const response = await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: board.id,
          title: newColTitle.trim(),
          isStart: newColIsStart,
          isEnd: newColIsEnd,
        }),
      })
      if (response.ok) {
        const newCol = await response.json()
        const column: Column = {
          ...newCol,
          tasks: [],
          createdAt: String(newCol.createdAt),
          updatedAt: String(newCol.updatedAt),
        }
        setBoard((prev) => ({ ...prev, columns: [...prev.columns, column] }))
        setNewColTitle('')
        setNewColIsStart(false)
        setNewColIsEnd(false)
        setShowAddColumn(false)
      }
    } catch (error) {
      console.error('Failed to add column:', error)
    }
  }

  // Column settings callbacks
  const handleUpdateColumn = async (columnId: string, data: Partial<Column>) => {
    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (response.ok) {
        const updated = await response.json()
        setBoard((prev) => ({
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId
              ? { ...col, ...updated, tasks: col.tasks, createdAt: String(updated.createdAt), updatedAt: String(updated.updatedAt) }
              : col
          ),
        }))
      }
    } catch (error) {
      console.error('Failed to update column:', error)
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setBoard((prev) => ({
          ...prev,
          columns: prev.columns.filter((col) => col.id !== columnId),
        }))
      }
    } catch (error) {
      console.error('Failed to delete column:', error)
    }
  }

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
        setBoard(serializeBoardDates(updatedBoard))
      }
    } catch (error) {
      console.error('Failed to reorder task:', error)
    }
  }

  const handleCreateTask = async (columnId: string, title: string, priority: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          columnId,
          priority,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        // Handle both single task and array (jira batch) responses
        const newTasks: Task[] = Array.isArray(result) ? result : [result]
        setBoard((prevBoard) => {
          const newColumns = prevBoard.columns.map((col) => {
            if (col.id === columnId) {
              const serialized = newTasks.map((t: Task) => ({
                ...t,
                startDate: t.startDate ? String(t.startDate) : null,
                endDate: t.endDate ? String(t.endDate) : null,
                createdAt: String(t.createdAt),
                updatedAt: String(t.updatedAt),
              }))
              return {
                ...col,
                tasks: [...col.tasks, ...serialized],
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

  const formatDateDisplay = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <>
      {/* Header actions */}
      <div className="flex items-center gap-3 px-6 mb-4">
        <button
          onClick={() => { setShowBoardSettings((v) => !v); setJiraUrlInput(board.jiraBaseUrl || '') }}
          className="px-4 py-2 text-sm bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/70 transition-colors text-gray-700 shadow-sm"
        >
          ⚙️ Board Settings
        </button>
      </div>

      {/* Board settings panel */}
      {showBoardSettings && (
        <div className="mx-6 mb-4 p-4 backdrop-blur-lg bg-white/50 border border-white/30 rounded-2xl shadow-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Board Settings</h3>
          <label className="block text-xs text-gray-500 mb-1">JIRA Base URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={jiraUrlInput}
              onChange={(e) => setJiraUrlInput(e.target.value)}
              placeholder="https://yourorg.atlassian.net/browse/"
              className="flex-1 px-3 py-2 bg-white/60 border border-white/50 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <button
              onClick={handleSaveJiraUrl}
              disabled={savingJira}
              className="px-4 py-2 bg-purple-400/70 text-white rounded-xl hover:bg-purple-500/70 text-sm transition-colors disabled:opacity-50"
            >
              {savingJira ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setShowBoardSettings(false)}
              className="px-3 py-2 bg-white/50 text-gray-500 rounded-xl hover:bg-white/70 text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 px-6 items-start">
          {board.columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onCreateTask={handleCreateTask}
              onDeleteTask={handleDeleteTask}
              onEditTask={openTaskModal}
              onUpdateColumn={handleUpdateColumn}
              onDeleteColumn={handleDeleteColumn}
            />
          ))}

          {/* Add column button / form */}
          <div className="shrink-0 w-80">
            {showAddColumn ? (
              <form onSubmit={handleAddColumn} className="backdrop-blur-md bg-white/30 rounded-2xl p-4 border border-white/30 shadow-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">New Column</h4>
                <input
                  type="text"
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  placeholder="Column title…"
                  className="w-full px-3 py-2 bg-white/60 border border-white/50 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300 mb-2"
                  autoFocus
                />
                <div className="flex items-center gap-4 mb-3 text-xs text-gray-600">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newColIsStart}
                      onChange={(e) => setNewColIsStart(e.target.checked)}
                      className="rounded"
                    />
                    🟢 Start
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newColIsEnd}
                      onChange={(e) => setNewColIsEnd(e.target.checked)}
                      className="rounded"
                    />
                    🔴 End
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-1.5 bg-purple-400/70 text-white rounded-xl hover:bg-purple-500/70 text-sm transition-colors">
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddColumn(false); setNewColTitle(''); setNewColIsStart(false); setNewColIsEnd(false) }}
                    className="px-3 py-1.5 bg-white/50 text-gray-600 rounded-xl hover:bg-white/70 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddColumn(true)}
                className="w-full py-3 backdrop-blur-md bg-white/20 border border-dashed border-white/40 rounded-2xl text-gray-500 hover:bg-white/30 hover:text-gray-700 transition-colors text-sm"
              >
                + Add Column
              </button>
            )}
          </div>
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" onClick={closeTaskModal}>
          <div
            className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="task-modal-title" className="text-lg font-bold text-gray-800 mb-4">Edit Task</h2>

            <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white/60 border border-white/50 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300 mb-3"
            />

            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 bg-white/60 border border-white/50 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300 mb-3 resize-y font-mono"
              placeholder="Add a description…"
            />

            <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
              className="w-full px-3 py-2 bg-white/60 border border-white/50 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300 mb-3"
            >
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="medium">🔵 Medium</option>
              <option value="low">🟢 Low</option>
              <option value="nice_to_have">⚪ Nice to have</option>
            </select>

            {(selectedTask.startDate || selectedTask.endDate) && (
              <div className="flex gap-4 mb-3 text-xs text-gray-500">
                {selectedTask.startDate && (
                  <div>
                    <span className="font-medium">Start:</span> {formatDateDisplay(selectedTask.startDate)}
                  </div>
                )}
                {selectedTask.endDate && (
                  <div>
                    <span className="font-medium">End:</span> {formatDateDisplay(selectedTask.endDate)}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={closeTaskModal}
                className="px-4 py-2 bg-white/50 text-gray-600 rounded-xl hover:bg-white/70 text-sm transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSaveTask}
                disabled={savingTask}
                className="px-4 py-2 bg-purple-400/70 text-white rounded-xl hover:bg-purple-500/70 text-sm transition-colors disabled:opacity-50"
              >
                {savingTask ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
