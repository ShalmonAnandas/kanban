export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950">
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800/60 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-6 py-3 flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 text-white font-bold text-sm shadow-sm">
            K
          </div>
          <div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-2.5 w-56 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mt-1" />
          </div>
        </div>
      </header>
      <main className="max-w-full mx-auto py-4">
        <div className="flex gap-4 px-6 overflow-x-auto">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-80 bg-white/60 dark:bg-gray-900/60 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-4"
            >
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              {[0, 1].map((j) => (
                <div
                  key={j}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 mb-2"
                >
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                  <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
