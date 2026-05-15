// src/hooks/useAI.ts
import { useState, useCallback } from 'react'
import type { AIMessage, AISuggestion } from '../types'
import { PROXY_BASE } from '../lib/constants'

export function useAI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasKey, setHasKey] = useState<boolean | null>(null)

  // Check if proxy is running and has key
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY_BASE}/api/health`)
      const data = await res.json()
      setHasKey(data.hasApiKey)
      return data as { hasApiKey: boolean; hasGithubToken: boolean }
    } catch {
      setHasKey(false)
      return null
    }
  }, [])

  const chat = useCallback(async (
    messages: AIMessage[],
    system: string
  ): Promise<string> => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${PROXY_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI hatası')
      return data.content?.[0]?.text || ''
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'AI bağlantı hatası'
      setError(msg)
      return ''
    } finally {
      setLoading(false)
    }
  }, [])

  const getSuggestions = useCallback(async (category: string): Promise<AISuggestion[]> => {
    const system = 'Sen bir GitHub repository öneri uzmanısın. Sadece JSON döndür, başka hiçbir şey yazma.'
    const content = `2024-2025 yılında öne çıkan, aktif geliştirilen GitHub repolarından ${category !== 'all' ? category + ' kategorisinde ' : ''}5 öneri yap. Gerçek repo adları kullan. Format: {"suggestions":[{"name":"owner/repo","reason":"kısa neden","category":"kategori"}]}`

    try {
      const text = await chat([{ role: 'user', content }], system)
      if (!text) return []
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      return parsed.suggestions || []
    } catch {
      return []
    }
  }, [chat])

  return { loading, error, hasKey, checkHealth, chat, getSuggestions }
}
