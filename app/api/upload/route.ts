import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getUserId } from '@/lib/session'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    await getUserId()

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, WebP images and MP4, WebM, MOV videos are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB for images, 50MB for videos)
    const isVideo = file.type.startsWith('video/')
    const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: isVideo ? 'File too large. Maximum size is 50MB for videos.' : 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Sanitize filename: extract extension from MIME type and use a unique ID
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
    }
    const ext = extMap[file.type] || 'bin'
    const uniqueName = `${crypto.randomUUID()}.${ext}`

    const blob = await put(uniqueName, file, {
      access: 'public',
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
