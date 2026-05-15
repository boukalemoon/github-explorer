// src/lib/utils.ts
import { CATEGORIES } from './constants'
import type { CategoryId, Repo } from '../types'

export function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

export function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 3600) return Math.floor(diff / 60) + 'dk önce'
  if (diff < 86400) return Math.floor(diff / 3600) + 'sa önce'
  if (diff < 2592000) return Math.floor(diff / 86400) + 'g önce'
  return Math.floor(diff / 2592000) + 'ay önce'
}

export function detectCategory(repo: Repo): CategoryId {
  const text = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase()
  for (const cat of CATEGORIES) {
    if (cat.id === 'all') continue
    if (cat.keywords.some(kw => text.includes(kw))) return cat.id
  }
  return 'all'
}

export function buildTrendingQuery(period: string, categoryId: CategoryId): string {
  const days = period === 'day' ? 1 : period === 'week' ? 7 : 30
  const since = new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0]
  let q = `created:>${since} stars:>10`
  if (categoryId !== 'all') {
    const cat = CATEGORIES.find(c => c.id === categoryId)
    if (cat?.keywords[0]) q += ` topic:${cat.keywords[0]}`
  }
  return q
}
