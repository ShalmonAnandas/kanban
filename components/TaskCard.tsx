'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from './KanbanBoard'

const PRIORITY_CONFIG: Record<string, { badge: string; accent: string }> = {
  critical: { badge: 'bg-red-100 text-red-700 ring-1 ring-red-200', accent: 'border-l-red-500' },
  high: { badge: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200', accent: 'border-l-orange-400' },
  medium: { badge: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200', accent: 'border-l-blue-400' },
  low: { badge: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200', accent: 'border-l-emerald-400' },
  nice_to_have: { badge: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200', accent: 'border-l-gray-300' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

// Parse `[TICKET-123](url)` markdown-style links in task title
function renderTitle(title: string) {
  const match = title.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
  if (match) {
    const url = match[2]
    const isSafeUrl = /^https?:\/\//i.test(url)
    if (isSafeUrl) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-violet-600 hover:text-violet-800 hover:underline font-semibold"
        >
          {match[1]}
        </a>
      )
    }
  }
  return <span>{title}</span>
}

type TaskCardProps = {
  task: Task
  isDragging?: boolean
  onDelete?: () => void
  onEdit?: (task: Task) => void
}

export function TaskCard({ task, isDragging, onDelete, onEdit }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  }

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

  const handleCardClick = () => {
    if (onEdit && !isDragging && !isSortableDragging) {
      onEdit(task)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className={`bg-white rounded-xl p-3.5 border border-gray-100 border-l-[3px] ${priority.accent} cursor-grab active:cursor-grabbing group ${
        isDragging ? 'shadow-lg ring-2 ring-violet-200' : 'shadow-sm hover:shadow-md'
      } transition-all duration-150`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${priority.badge}`}>
            {task.priority.replace('_', ' ')}
          </span>
          <h4 className="text-sm font-medium text-gray-800 mt-1.5 break-words leading-snug">
            {renderTitle(task.title)}
          </h4>
          {task.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2 break-words leading-relaxed">
              {task.description.length > 80
                ? task.description.slice(0, 80) + '…'
                : task.description}
            </p>
          )}
          {(task.startDate || task.endDate) && (
            <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400 font-medium">
              {task.startDate && <span className="bg-gray-50 px-1.5 py-0.5 rounded">📅 {formatDate(task.startDate)}</span>}
              {task.startDate && task.endDate && <span className="text-gray-300">→</span>}
              {task.endDate && <span className="bg-gray-50 px-1.5 py-0.5 rounded">🏁 {formatDate(task.endDate)}</span>}
            </div>
          )}
        </div>
        {onDelete && !isDragging && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="text-gray-300 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
            aria-label="Delete task"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
