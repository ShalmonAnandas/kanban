'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from './KanbanBoard'

type TaskCardProps = {
  task: Task
  isDragging?: boolean
  onDelete?: () => void
}

export function TaskCard({ task, isDragging, onDelete }: TaskCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg' : 'hover:shadow-md'
      } transition-shadow`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
          {task.description && (
            <p className="text-xs text-gray-600 mt-1">{task.description}</p>
          )}
        </div>
        {onDelete && !isDragging && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="text-gray-400 hover:text-red-600 transition-colors"
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
