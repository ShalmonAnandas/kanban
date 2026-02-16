'use client'

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3',
  }

  return (
    <div
      className={`inline-block animate-spin rounded-full border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite] ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

type LoadingOverlayProps = {
  message?: string
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-2xl">
      <div className="flex flex-col items-center gap-2">
        <Spinner size="lg" className="text-violet-500" />
        <span className="text-sm text-gray-500 font-medium">{message}</span>
      </div>
    </div>
  )
}
