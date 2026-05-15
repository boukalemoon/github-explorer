// src/types/index.ts

export interface Repo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  language: string | null
  topics: string[]
  updated_at: string
  created_at: string
  license: { name: string } | null
  owner: {
    login: string
    avatar_url: string
    html_url: string
  }
  watchers_count: number
  default_branch: string
}

export interface GitHubSearchResult {
  total_count: number
  incomplete_results: boolean
  items: Repo[]
}

export type SortOption = 'stars' | 'forks' | 'updated'
export type TrendPeriod = 'day' | 'week' | 'month'
export type CategoryId = 'all' | 'ai' | 'web' | 'devtools' | 'security' | 'mobile' | 'data' | 'infra'

export interface Category {
  id: CategoryId
  label: string
  icon: string
  keywords: string[]
}

export interface AISuggestion {
  name: string
  reason: string
  category: string
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ServerHealth {
  status: string
  hasApiKey: boolean
  hasGithubToken: boolean
}
