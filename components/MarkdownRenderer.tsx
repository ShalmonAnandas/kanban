'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type MarkdownRendererProps = {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            const isSafe = href && /^https?:\/\//i.test(href)
            return (
              <a
                href={isSafe ? href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-violet-600 hover:text-violet-800 hover:underline"
                {...props}
              >
                {children}
              </a>
            )
          },
          img: ({ src, alt, ...props }) => {
            const srcStr = typeof src === 'string' ? src : ''
            const isSafe = srcStr && /^https?:\/\//i.test(srcStr)
            if (!isSafe) return null
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={srcStr}
                alt={alt || ''}
                className="max-w-full h-auto rounded-lg inline-block"
                {...props}
              />
            )
          },
          p: ({ children, ...props }) => (
            <p className="mb-2 last:mb-0" {...props}>{children}</p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside mb-2" {...props}>{children}</ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside mb-2" {...props}>{children}</ol>
          ),
          h1: ({ children, ...props }) => (
            <h1 className="text-lg font-bold mb-2" {...props}>{children}</h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-base font-bold mb-1.5" {...props}>{children}</h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-sm font-bold mb-1" {...props}>{children}</h3>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName
            if (isInline) {
              return (
                <code className="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-[11px] font-mono" {...props}>
                  {children}
                </code>
              )
            }
            return (
              <code className={`block bg-gray-50 rounded-lg p-2 text-[11px] font-mono overflow-x-auto ${codeClassName || ''}`} {...props}>
                {children}
              </code>
            )
          },
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600 mb-2" {...props}>
              {children}
            </blockquote>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto mb-2">
              <table className="border-collapse border border-gray-200 text-xs w-full" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-gray-200 bg-gray-50 px-2 py-1 text-left font-semibold" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-gray-200 px-2 py-1" {...props}>
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
