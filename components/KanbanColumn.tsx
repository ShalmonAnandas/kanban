'use client'

import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'
import { Column, Task, SortConfig, SortField } from './KanbanBoard'
import { PASTEL_COLORS } from '@/lib/colors'

// Convert hex color to pastel version by mixing with white
const PASTEL_MIX_RATIO = 0.6

function toPastel(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const pr = Math.round(r + (255 - r) * PASTEL_MIX_RATIO)
  const pg = Math.round(g + (255 - g) * PASTEL_MIX_RATIO)
  const pb = Math.round(b + (255 - b) * PASTEL_MIX_RATIO)
  return `#${pr.toString(16).padStart(2, '0')}${pg.toString(16).padStart(2, '0')}${pb.toString(16).padStart(2, '0')}`
}

type KanbanColumnProps = {
  column: Column
  onAddTask: (columnId: string) => void
  onDeleteTask: (taskId: string) => void
  onEditTask: (task: Task) => void
  onViewTask: (task: Task) => void
  onUpdateColumn: (columnId: string, data: Partial<Column>) => void
  onDeleteColumn: (columnId: string) => void
  onTogglePin: (taskId: string) => void
  onSortChange: (columnId: string, config: SortConfig | null) => void
  sortConfig?: SortConfig
  isOver?: boolean
  isOverlay?: boolean
}

export function KanbanColumn({
  column,
  onAddTask,
  onDeleteTask,
  onEditTask,
  onViewTask,
  onUpdateColumn,
  onDeleteColumn,
  onTogglePin,
  onSortChange,
  sortConfig,
  isOver,
  isOverlay,
}: KanbanColumnProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(column.title)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showCustomColor, setShowCustomColor] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  const { setNodeRef: setDroppableRef, isOver: isDroppableOver } = useDroppable({
    id: column.id,
  })

  const sortable = useSortable({ id: column.id, disabled: isOverlay })

  const style = isOverlay
    ? { opacity: 0.9 }
    : {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.4 : 1,
      }

  const highlighted = isOver || isDroppableOver

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
        setConfirmDelete(false)
        setShowColorPicker(false)
        setShowCustomColor(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  // Close sort menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
    }
    if (showSortMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSortMenu])

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

  const handleSortSelect = (field: SortField) => {
    if (sortConfig?.field === field) {
      // Toggle direction or clear
      if (sortConfig.direction === 'asc') {
        onSortChange(column.id, { field, direction: 'desc' })
      } else {
        onSortChange(column.id, null)
      }
    } else {
      onSortChange(column.id, { field, direction: 'asc' })
    }
    setShowSortMenu(false)
  }

  return (
    <div
      ref={isOverlay ? undefined : sortable.setNodeRef}
      style={style}
      className={`flex flex-col w-72 h-[calc(100vh-8rem)] rounded-xl shrink-0 transition-all duration-200 ${
        highlighted
          ? 'bg-violet-50/80 dark:bg-violet-900/20 ring-2 ring-violet-300/60 dark:ring-violet-700/60 ring-offset-1'
          : 'bg-gray-50/80 dark:bg-gray-800/80'
      } ${sortable.isDragging ? 'opacity-40' : ''}`}
    >
      {/* Color bar behind column title */}
      {column.color && (
        <div
          className="h-1.5 rounded-t-xl shrink-0"
          style={{ backgroundColor: column.color }}
        />
      )}

      {/* Column Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2"
        style={column.color ? { backgroundColor: column.color + '33' } : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Drag handle */}
          <button
            {...(isOverlay ? {} : sortable.attributes)}
            {...(isOverlay ? {} : sortable.listeners)}
            className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors shrink-0 touch-none"
            aria-label="Drag to reorder column"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="7" cy="4" r="1.5" />
              <circle cx="13" cy="4" r="1.5" />
              <circle cx="7" cy="10" r="1.5" />
              <circle cx="13" cy="10" r="1.5" />
              <circle cx="7" cy="16" r="1.5" />
              <circle cx="13" cy="16" r="1.5" />
            </svg>
          </button>
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setRenameValue(column.title); setIsRenaming(false) } }}
              className="text-sm font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-violet-400 w-full"
              autoFocus
            />
          ) : (
            <h3 className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider truncate">
              {column.title}
            </h3>
          )}
          {column.isStart && (
            <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded whitespace-nowrap" title="Start column" aria-label="Start column">START</span>
          )}
          {column.isEnd && (
            <span className="text-[9px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded whitespace-nowrap" title="End column" aria-label="End column">END</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] font-semibold text-gray-400 bg-white/80 dark:bg-gray-700/80 px-1.5 py-0.5 rounded-md">
            {column.tasks.length}
          </span>
          {/* Sort button */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setShowSortMenu((v) => !v)}
              className={`p-1 rounded-md transition-colors ${sortConfig ? 'text-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80'}`}
              aria-label="Sort column"
              title="Sort column"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-7 z-50 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 text-xs">
                <button
                  onClick={() => handleSortSelect('priority')}
                  className={`w-full text-left px-3 py-1.5 transition-colors flex items-center justify-between ${sortConfig?.field === 'priority' ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                >
                  Criticality
                  {sortConfig?.field === 'priority' && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                </button>
                <button
                  onClick={() => handleSortSelect('createdAt')}
                  className={`w-full text-left px-3 py-1.5 transition-colors flex items-center justify-between ${sortConfig?.field === 'createdAt' ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                >
                  Date Added
                  {sortConfig?.field === 'createdAt' && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                </button>
                <button
                  onClick={() => handleSortSelect('endDate')}
                  className={`w-full text-left px-3 py-1.5 transition-colors flex items-center justify-between ${sortConfig?.field === 'endDate' ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                >
                  Date Ended
                  {sortConfig?.field === 'endDate' && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                </button>
                {sortConfig && (
                  <>
                    <hr className="my-1 border-gray-100 dark:border-gray-700" />
                    <button
                      onClick={() => { onSortChange(column.id, null); setShowSortMenu(false) }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                    >
                      Clear Sort
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-white/80 dark:hover:bg-gray-700/80"
              aria-label="Column settings"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="4" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="16" r="1.5" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-7 z-50 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 text-xs">
                <button
                  onClick={() => { setIsRenaming(true); setShowMenu(false); setRenameValue(column.title) }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  Rename
                </button>
                <button
                  onClick={handleToggleStart}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {column.isStart ? 'Unset Start' : 'Set as Start'}
                </button>
                <button
                  onClick={handleToggleEnd}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {column.isEnd ? 'Unset End' : 'Set as End'}
                </button>
                <button
                  onClick={() => { setShowColorPicker((v) => !v); setShowCustomColor(false) }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2"
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 shrink-0"
                    style={{ backgroundColor: column.color || '#ccc' }}
                  />
                  Change Color
                </button>
                {showColorPicker && (
                  <div className="px-3 py-2">
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      {PASTEL_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            onUpdateColumn(column.id, { color })
                            setShowColorPicker(false)
                            setShowMenu(false)
                          }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                            column.color === color ? 'border-gray-700 dark:border-gray-300 ring-1 ring-gray-400' : 'border-gray-200 dark:border-gray-600'
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Set column color to ${color}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setShowCustomColor((v) => !v)}
                      className="w-full text-left px-2 py-1 text-[10px] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-1.5"
                    >
                      <span className="inline-block w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 shrink-0 bg-gradient-to-r from-red-300 via-green-300 to-blue-300" />
                      Custom Color…
                    </button>
                    {showCustomColor && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="color"
                          defaultValue={column.color || '#a78bfa'}
                          onChange={(e) => {
                            const pastel = toPastel(e.target.value)
                            onUpdateColumn(column.id, { color: pastel })
                          }}
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0 opacity-70"
                          title="Pick a custom color (pastel applied)"
                        />
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">Pick & apply pastel</span>
                      </div>
                    )}
                  </div>
                )}
                <hr className="my-1 border-gray-100 dark:border-gray-700" />
                <button
                  onClick={handleDelete}
                  className={`w-full text-left px-3 py-1.5 transition-colors ${confirmDelete ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold' : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'}`}
                  aria-label={confirmDelete ? 'Press again to confirm deletion' : 'Delete column'}
                >
                  {confirmDelete ? 'Confirm?' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task List */}
      <SortableContext
        items={column.tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setDroppableRef}
          tabIndex={0}
          className={`flex flex-col gap-1.5 px-2 pb-2 min-h-0 flex-1 overflow-y-auto transition-colors duration-200 rounded-lg mx-1 ${
            highlighted ? 'bg-violet-100/30 dark:bg-violet-900/10' : ''
          }`}
        >
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={() => onDeleteTask(task.id)}
              onEdit={onEditTask}
              onView={onViewTask}
              onTogglePin={() => onTogglePin(task.id)}
              pinnedCount={column.tasks.filter((t) => t.pinned).length}
            />
          ))}
          {column.tasks.length === 0 && (
            <div className={`flex items-center justify-center h-20 rounded-lg border-2 border-dashed transition-colors duration-200 ${
              highlighted ? 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/10' : 'border-gray-200/60 dark:border-gray-700/60'
            }`}>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {highlighted ? 'Drop here' : 'No tasks'}
              </span>
            </div>
          )}
        </div>
      </SortableContext>

      {/* Add Task */}
      <div className="px-2 pb-2">
        <button
          onClick={() => onAddTask(column.id)}
          className="w-full px-2 py-1.5 text-left text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors text-xs font-medium hover:bg-white/60 dark:hover:bg-gray-700/60"
        >
          + Add task
        </button>
      </div>
    </div>
  )
}
