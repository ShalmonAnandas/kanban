'use client'

import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { TaskCard } from './TaskCard'
import { Column, Task } from './KanbanBoard'

type KanbanColumnProps = {
  column: Column
  onCreateTask: (columnId: string, title: string, priority: string) => void
  onDeleteTask: (taskId: string) => void
  onEditTask: (task: Task) => void
  onUpdateColumn: (columnId: string, data: Partial<Column>) => void
  onDeleteColumn: (columnId: string) => void
}

export function KanbanColumn({
  column,
  onCreateTask,
  onDeleteTask,
  onEditTask,
  onUpdateColumn,
  onDeleteColumn,
}: KanbanColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('medium')
  const [showMenu, setShowMenu] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(column.title)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { setNodeRef } = useDroppable({
    id: column.id,
  })

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
        setConfirmDelete(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTaskTitle.trim()) {
      onCreateTask(column.id, newTaskTitle.trim(), newTaskPriority)
      setNewTaskTitle('')
      setNewTaskPriority('medium')
      setIsAddingTask(false)
    }
  }

  const handleRename = () => {
    if (renameValue.trim() && renameValue.trim() !== column.title) {
      onUpdateColumn(column.id, { title: renameValue.trim() })
    }
    setIsRenaming(false)
    setShowMenu(false)
  }

  const handleToggleStart = () => {
    onUpdateColumn(column.id, { isStart: !column.isStart })
    setShowMenu(false)
  }

  const handleToggleEnd = () => {
    onUpdateColumn(column.id, { isEnd: !column.isEnd })
    setShowMenu(false)
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDeleteColumn(column.id)
    setShowMenu(false)
    setConfirmDelete(false)
  }

  return (
    <div className="flex flex-col w-80 backdrop-blur-md bg-white/30 rounded-2xl p-4 shrink-0 border border-white/30 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename() }}
              className="text-sm font-semibold text-gray-800 bg-white/60 border border-white/50 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-300 w-full"
              autoFocus
            />
          ) : (
            <h3 className="font-semibold text-gray-800 text-sm truncate">
              {column.title}
            </h3>
          )}
          {column.isStart && (
            <span className="text-xs bg-green-200/70 text-green-800 px-1.5 py-0.5 rounded-full whitespace-nowrap" title="Start column" aria-label="Start column">🟢 Start</span>
          )}
          {column.isEnd && (
            <span className="text-xs bg-red-200/70 text-red-800 px-1.5 py-0.5 rounded-full whitespace-nowrap" title="End column" aria-label="End column">🔴 End</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-gray-500 bg-white/40 px-1.5 py-0.5 rounded-full">
            {column.tasks.length}
          </span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded-lg hover:bg-white/40"
              aria-label="Column settings"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="4" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="16" r="1.5" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-7 z-50 w-44 bg-white/90 backdrop-blur-lg rounded-xl shadow-xl border border-white/40 py-1 text-sm">
                <button
                  onClick={() => { setIsRenaming(true); setShowMenu(false); setRenameValue(column.title) }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50/60 text-gray-700"
                >
                  ✏️ Rename
                </button>
                <button
                  onClick={handleToggleStart}
                  className="w-full text-left px-3 py-1.5 hover:bg-green-50/60 text-gray-700"
                >
                  {column.isStart ? '🟢 Unset Start' : '🟢 Set as Start'}
                </button>
                <button
                  onClick={handleToggleEnd}
                  className="w-full text-left px-3 py-1.5 hover:bg-red-50/60 text-gray-700"
                >
                  {column.isEnd ? '🔴 Unset End' : '🔴 Set as End'}
                </button>
                <hr className="my-1 border-gray-200/60" />
                <button
                  onClick={handleDelete}
                  className={`w-full text-left px-3 py-1.5 ${confirmDelete ? 'bg-red-100 text-red-700 font-semibold' : 'hover:bg-red-50/60 text-red-600'}`}
                >
                  {confirmDelete ? '⚠️ Confirm Delete?' : '🗑️ Delete Column'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SortableContext
        items={column.tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="flex flex-col gap-2 min-h-[200px] flex-1"
        >
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={() => onDeleteTask(task.id)}
              onEdit={onEditTask}
            />
          ))}
        </div>
      </SortableContext>

      {isAddingTask ? (
        <form onSubmit={handleSubmit} className="mt-3">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Enter task title..."
            className="w-full px-3 py-2 bg-white/60 border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800 text-sm backdrop-blur-sm"
            autoFocus
            onBlur={() => {
              if (!newTaskTitle.trim()) {
                setIsAddingTask(false)
              }
            }}
          />
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value)}
            className="w-full mt-2 px-3 py-1.5 bg-white/60 border border-white/50 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🔵 Medium</option>
            <option value="low">🟢 Low</option>
            <option value="nice_to_have">⚪ Nice to have</option>
          </select>
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="px-3 py-1.5 bg-purple-400/70 text-white rounded-xl hover:bg-purple-500/70 text-sm backdrop-blur-sm transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingTask(false)
                setNewTaskTitle('')
                setNewTaskPriority('medium')
              }}
              className="px-3 py-1.5 bg-white/50 text-gray-600 rounded-xl hover:bg-white/70 text-sm backdrop-blur-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAddingTask(true)}
          className="mt-3 w-full px-3 py-2 text-left text-gray-500 hover:bg-white/40 rounded-xl transition-colors text-sm"
        >
          + Add task
        </button>
      )}
    </div>
  )
}
