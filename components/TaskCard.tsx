'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from './KanbanBoard'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/80 text-white',
  high: 'bg-orange-400/80 text-white',
  medium: 'bg-blue-400/80 text-white',
  low: 'bg-green-400/80 text-white',
  nice_to_have: 'bg-gray-400/80 text-white',
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
          className="text-indigo-600 hover:underline font-medium"
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

  const priorityClass = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium

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
      className={`backdrop-blur-lg bg-white/50 rounded-xl p-3 border border-white/30 cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-xl' : 'shadow-md hover:shadow-lg'
      } transition-all`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityClass}`}>
              {task.priority.replace('_', ' ')}
            </span>
          </div>
          <h4 className="text-sm font-medium text-gray-800 mt-1.5 break-words">
            {renderTitle(task.title)}
          </h4>
          {task.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 break-words">
              {task.description.length > 80
                ? task.description.slice(0, 80) + '…'
                : task.description}
            </p>
          )}
          {(task.startDate || task.endDate) && (
            <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
              {task.startDate && <span>📅 {formatDate(task.startDate)}</span>}
              {task.startDate && task.endDate && <span>→</span>}
              {task.endDate && <span>🏁 {formatDate(task.endDate)}</span>}
            </div>
          )}
        </div>
        {onDelete && !isDragging && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
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
