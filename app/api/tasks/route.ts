import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/session'

// Fetch issue details from JIRA using PAT (Bearer token auth)
async function fetchJiraIssue(baseUrl: string, pat: string, issueKey: string): Promise<{ summary: string; description: string | null } | null> {
  try {
    // Derive API base URL from the browse URL (e.g. https://org.atlassian.net/browse/ -> https://org.atlassian.net)
    const url = new URL(baseUrl)
    const apiBase = url.origin
    const apiUrl = `${apiBase}/rest/api/2/issue/${encodeURIComponent(issueKey)}?fields=summary,description`

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`JIRA API returned ${response.status} for issue ${issueKey}`)
      return null
    }

    const data = await response.json()
    return {
      summary: data.fields?.summary || issueKey,
      description: data.fields?.description || null,
    }
  } catch (error) {
    console.error(`Failed to fetch JIRA issue ${issueKey}:`, error)
    return null
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const { title, description, columnId, priority } = await request.json()
    
    if (!title || !columnId) {
      return NextResponse.json(
        { error: 'Title and columnId are required' },
        { status: 400 }
      )
    }
    
    // Verify column belongs to user
    const column = await prisma.column.findFirst({
      where: {
        id: columnId,
        board: {
          userId,
        },
      },
      include: {
        board: true,
      },
    })
    
    if (!column) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      )
    }
    
    // Handle #jira prefix for bulk ticket creation
    if (title.startsWith('#jira ')) {
      const jiraBaseUrl = column.board.jiraBaseUrl
      if (!jiraBaseUrl) {
        return NextResponse.json(
          { error: 'Board does not have a jiraBaseUrl configured' },
          { status: 400 }
        )
      }

      const numbers = title.slice(6).split(',').map((n: string) => n.trim()).filter(Boolean)
      if (numbers.length === 0) {
        return NextResponse.json(
          { error: 'No ticket numbers provided' },
          { status: 400 }
        )
      }

      // Validate ticket numbers contain only alphanumeric characters and hyphens
      const validTicket = /^[a-zA-Z0-9-]+$/
      for (const num of numbers) {
        if (!validTicket.test(num)) {
          return NextResponse.json(
            { error: `Invalid ticket number: ${num}` },
            { status: 400 }
          )
        }
      }

      // Ensure jiraBaseUrl ends with a separator for clean concatenation
      const baseUrl = jiraBaseUrl.endsWith('/') || jiraBaseUrl.endsWith('-') ? jiraBaseUrl : jiraBaseUrl + '/'

      const jiraPat = column.board.jiraPat

      const lastTask = await prisma.task.findFirst({
        where: { columnId },
        orderBy: { order: 'desc' },
      })
      let nextOrder = (lastTask?.order ?? -1) + 1

      const tasks = []
      for (const num of numbers) {
        let taskTitle = `[TICKET-${num}](${baseUrl}${num})`
        let taskDescription = description || null

        // If PAT is configured, fetch issue details from JIRA
        if (jiraPat) {
          const issueData = await fetchJiraIssue(jiraBaseUrl, jiraPat, num)
          if (issueData) {
            taskTitle = `[${issueData.summary}](${baseUrl}${num})`
            if (!taskDescription && issueData.description) {
              taskDescription = issueData.description
            }
          }
        }

        const task = await prisma.task.create({
          data: {
            title: taskTitle,
            description: taskDescription,
            columnId,
            priority: priority || 'medium',
            order: nextOrder++,
            ...(column.isStart && { startDate: new Date() }),
          },
        })
        tasks.push(task)
      }

      return NextResponse.json(tasks, { status: 201 })
    }
    
    // Get the next order number
    const lastTask = await prisma.task.findFirst({
      where: { columnId },
      orderBy: { order: 'desc' },
    })
    
    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        columnId,
        priority: priority || 'medium',
        order: (lastTask?.order ?? -1) + 1,
        ...(column.isStart && { startDate: new Date() }),
      },
    })
    
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
