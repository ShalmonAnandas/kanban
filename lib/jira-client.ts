// Client-side JIRA integration
// Uses browser's session to bypass Zscaler restrictions

export type JiraIssueData = {
  summary: string
  description: string | null
}

/**
 * Fetch JIRA issue details client-side using browser's session.
 * This allows access through Zscaler since the browser session is authenticated.
 */
export async function fetchJiraIssueClientSide(
  baseUrl: string,
  pat: string,
  issueKey: string
): Promise<JiraIssueData | null> {
  try {
    // Derive API base URL from the browse URL
    const url = new URL(baseUrl)
    const apiBase = url.origin
    const apiUrl = `${apiBase}/rest/api/2/issue/${encodeURIComponent(issueKey)}?fields=summary,description`

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/json',
      },
      // Use browser's credentials/session
      credentials: 'include',
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
