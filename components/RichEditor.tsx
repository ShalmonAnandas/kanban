'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TiptapImage from '@tiptap/extension-image'
import { useEffect, useCallback } from 'react'

type RichEditorProps = {
  content: string
  onChange: (markdown: string) => void
  placeholder?: string
  className?: string
}

function toMarkdown(json: Record<string, unknown>): string {
  if (!json || !json.content) return ''
  return (json.content as Record<string, unknown>[]).map(node => nodeToMarkdown(node)).join('\n\n')
}

function nodeToMarkdown(node: Record<string, unknown>): string {
  if (!node) return ''
  const type = node.type as string

  switch (type) {
    case 'paragraph':
      return inlineContentToMarkdown(node.content as Record<string, unknown>[] | undefined)
    case 'heading': {
      const level = (node.attrs as Record<string, unknown>)?.level as number || 1
      const prefix = '#'.repeat(level)
      return `${prefix} ${inlineContentToMarkdown(node.content as Record<string, unknown>[] | undefined)}`
    }
    case 'bulletList':
      return (node.content as Record<string, unknown>[])?.map(item => {
        const text = (item.content as Record<string, unknown>[])?.map(c => nodeToMarkdown(c)).join('\n')
        return `- ${text}`
      }).join('\n') || ''
    case 'orderedList':
      return (node.content as Record<string, unknown>[])?.map((item, i) => {
        const text = (item.content as Record<string, unknown>[])?.map(c => nodeToMarkdown(c)).join('\n')
        return `${i + 1}. ${text}`
      }).join('\n') || ''
    case 'blockquote':
      return (node.content as Record<string, unknown>[])?.map(c => `> ${nodeToMarkdown(c)}`).join('\n') || ''
    case 'codeBlock':
      return `\`\`\`\n${inlineContentToMarkdown(node.content as Record<string, unknown>[] | undefined)}\n\`\`\``
    case 'horizontalRule':
      return '---'
    case 'image': {
      const attrs = node.attrs as Record<string, unknown>
      return `![${attrs?.alt || ''}](${attrs?.src || ''})`
    }
    default:
      return inlineContentToMarkdown(node.content as Record<string, unknown>[] | undefined)
  }
}

function inlineContentToMarkdown(content: Record<string, unknown>[] | undefined): string {
  if (!content) return ''
  return content.map(node => {
    if (node.type === 'text') {
      let text = node.text as string
      const marks = node.marks as Record<string, unknown>[] | undefined
      if (marks) {
        for (const mark of marks) {
          switch (mark.type) {
            case 'bold': text = `**${text}**`; break
            case 'italic': text = `*${text}*`; break
            case 'strike': text = `~~${text}~~`; break
            case 'underline': text = `<u>${text}</u>`; break
            case 'code': text = `\`${text}\``; break
            case 'link': {
              const href = (mark.attrs as Record<string, unknown>)?.href as string
              text = `[${text}](${href})`
              break
            }
          }
        }
      }
      return text
    }
    if (node.type === 'image') {
      const attrs = node.attrs as Record<string, unknown>
      return `![${attrs?.alt || ''}](${attrs?.src || ''})`
    }
    if (node.type === 'hardBreak') return '\n'
    return ''
  }).join('')
}

function markdownToHtml(md: string): string {
  if (!md) return '<p></p>'
  let html = md
  // Code blocks first
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>')
  // Underline
  html = html.replace(/<u>(.+?)<\/u>/g, '<u>$1</u>')
  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  // Blockquote
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr />')
  // Unordered list
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
  // Ordered list
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
  // Paragraphs - split by double newlines
  const blocks = html.split(/\n\n+/)
  html = blocks.map(block => {
    if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<ol') ||
        block.startsWith('<blockquote') || block.startsWith('<pre') || block.startsWith('<hr')) {
      return block
    }
    // Replace single newlines with <br>
    return `<p>${block.replace(/\n/g, '<br />')}</p>`
  }).join('')
  return html || '<p></p>'
}

export function RichEditor({ content, onChange, placeholder, className = '' }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-violet-600 hover:text-violet-800 underline',
        },
      }),
      TiptapImage.configure({
        inline: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded inline-block',
        },
      }),
    ],
    content: markdownToHtml(content),
    editorProps: {
      attributes: {
        class: `focus:outline-none min-h-[80px] text-xs text-gray-800 ${className}`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON()
      const md = toMarkdown(json as Record<string, unknown>)
      onChange(md)
    },
  })

  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    if (!/^https?:\/\//i.test(url)) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const addImage = useCallback(() => {
    if (!editor) return
    const url = window.prompt('Image URL')
    if (!url || !/^https?:\/\//i.test(url)) return
    editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-white border-b border-gray-200">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline"
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <span className="line-through">S</span>
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 mx-0.5" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 mx-0.5" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline code"
        >
          {'</>'}
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 mx-0.5" />
        <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Link">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={addImage} active={false} title="Insert image">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </ToolbarButton>
      </div>
      {/* Editor */}
      <div className="px-3 py-2">
        {!content && !editor.getText() && placeholder && (
          <div className="absolute text-xs text-gray-400 pointer-events-none">{placeholder}</div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1 rounded text-xs font-medium transition-colors ${
        active
          ? 'bg-violet-100 text-violet-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}
