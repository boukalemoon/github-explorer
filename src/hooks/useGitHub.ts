// src/hooks/useGitHub.ts
//
// "Sonsuz Keşif" motoru — GitHub'ın 1000 sonuç limitini 4 stratejiyle aşar:
//   1. Yıldız bantlama   : stars:>10000 / stars:1000..10000 / stars:100..999 / stars:<100
//   2. Zaman dilimleme   : Trend sorgularını haftalık/aylık dilimlere böler
//   3. Paralel sorgular  : Kategori keyword'leri paralel çalışır, merge edilir
//   4. Cursor pagination : Her "sayfa" ileri bant kayarak yeni 1000'lik kümeye girer
//
// Kullanıcıya göre: sonsuz scroll yerine "Daha fazla yükle" + toplam erişilebilir sayı

import { useState, useCallback, useRef } from 'react'
import type { Repo, SortOption, CategoryId } from '../types'
import { CATEGORIES, PER_PAGE } from '../lib/constants'

const GITHUB_API = 'https://api.github.com'

// Yıldız bantları — her biri ayrı 1000 sonuçluk kova
const STAR_BANDS = [
  'stars:>50000',
  'stars:10000..50000',
  'stars:1000..9999',
  'stars:100..999',
  'stars:10..99',
  'stars:<10',
]

// Zaman dilimleme: period + offset ile geçmişe git
function buildTimeSlices(period: string, sliceIndex: number): string {
  const msPerSlice = period === 'day' ? 86_400_000
    : period === 'week' ? 7 * 86_400_000
    : 30 * 86_400_000

  const end = new Date(Date.now() - sliceIndex * msPerSlice)
  const start = new Date(end.getTime() - msPerSlice)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return `created:${fmt(start)}..${fmt(end)}`
}

// Kategori için paralel keyword sorguları
function buildCategoryQueries(categoryId: CategoryId, baseQuery: string): string[] {
  if (categoryId === 'all') return [baseQuery]
  const cat = CATEGORIES.find(c => c.id === categoryId)
  if (!cat) return [baseQuery]
  // İlk 3 keyword'ü paralel sorgula — rate limit dengeleme
  return cat.keywords.slice(0, 3).map(kw =>
    baseQuery ? `${baseQuery} topic:${kw}` : `topic:${kw}`
  )
}

// Dedup by repo id
function mergeUnique(existing: Repo[], incoming: Repo[]): Repo[] {
  const seen = new Set(existing.map(r => r.id))
  return [...existing, ...incoming.filter(r => !seen.has(r.id))]
}

export interface SearchState {
  repos: Repo[]
  loading: boolean
  error: string
  totalCount: number        // Gerçek erişilebilir toplam (hesaplanmış)
  loadedCount: number       // Şu ana kadar yüklenen
  hasMore: boolean          // Daha yüklenebilir var mı
  currentBand: number       // Hangi yıldız bandındayız
  currentSlice: number      // Hangi zaman dilimindeyiz
  mode: 'normal' | 'deep'   // Normal sayfalama mı, derin tarama mı
}

export interface SearchConfig {
  query: string
  sort: SortOption
  categoryId: CategoryId
  isTrending: boolean
  trendPeriod?: string
}

export function useGitHub() {
  const [state, setState] = useState<SearchState>({
    repos: [],
    loading: false,
    error: '',
    totalCount: 0,
    loadedCount: 0,
    hasMore: false,
    currentBand: 0,
    currentSlice: 0,
    mode: 'normal',
  })

  const abortRef = useRef<AbortController | null>(null)
  const configRef = useRef<SearchConfig | null>(null)

  // Tek bir GitHub API isteği
  async function fetchPage(
    q: string,
    page: number,
    sort: SortOption,
    signal: AbortSignal
  ): Promise<{ items: Repo[]; total_count: number }> {
    const params = new URLSearchParams({
      q,
      sort,
      order: 'desc',
      per_page: String(PER_PAGE),
      page: String(page),
    })

    const res = await fetch(`${GITHUB_API}/search/repositories?${params}`, {
      headers: { Accept: 'application/vnd.github.mercy-preview+json' },
      signal,
    })

    if (!res.ok) {
      if (res.status === 403) {
        const reset = res.headers.get('X-RateLimit-Reset')
        const wait = reset ? Math.ceil((+reset * 1000 - Date.now()) / 1000) : 60
        throw new Error(`GitHub rate limit! ${wait} saniye bekle veya .env'e GITHUB_TOKEN ekle.`)
      }
      if (res.status === 422) throw new Error('Geçersiz arama sorgusu.')
      throw new Error(`GitHub API hatası: ${res.status}`)
    }

    return res.json()
  }

  // Paralel çoklu sorgu — sonuçları merge eder
  async function fetchParallel(
    queries: string[],
    page: number,
    sort: SortOption,
    signal: AbortSignal
  ): Promise<{ items: Repo[]; total_count: number }> {
    const results = await Promise.allSettled(
      queries.map(q => fetchPage(q, page, sort, signal))
    )

    let allItems: Repo[] = []
    let maxTotal = 0

    for (const r of results) {
      if (r.status === 'fulfilled') {
        allItems = mergeUnique(allItems, r.value.items)
        maxTotal = Math.max(maxTotal, r.value.total_count)
      }
    }

    // Hepsi başarısızsa ilk hatayı fırlat
    if (allItems.length === 0 && results.every(r => r.status === 'rejected')) {
      throw (results[0] as PromiseRejectedResult).reason
    }

    return { items: allItems, total_count: maxTotal }
  }

  // İlk arama — sıfırdan başlar
  const search = useCallback(async (config: SearchConfig) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    configRef.current = config

    setState(s => ({ ...s, loading: true, error: '', repos: [], loadedCount: 0, currentBand: 0, currentSlice: 0 }))

    try {
      const signal = abortRef.current.signal
      let queries: string[]
      let q: string

      if (config.isTrending) {
        // Trend: zaman dilimi 0 + kategori paralel sorgular
        const timeFilter = buildTimeSlices(config.trendPeriod || 'week', 0)
        const base = `${timeFilter} stars:>5`
        queries = buildCategoryQueries(config.categoryId, base)
      } else {
        // Arama: yıldız bandı 0 + kategori paralel sorgular
        const band = STAR_BANDS[0]
        const base = config.query ? `${config.query} ${band}` : band
        queries = buildCategoryQueries(config.categoryId, base)
      }

      const { items, total_count } = await fetchParallel(queries, 1, config.sort, signal)

      // Gerçek erişilebilir tahmini: band sayısı × 1000
      const estimatedTotal = config.isTrending
        ? Math.min(total_count, 1000) * 12  // 12 zaman dilimi
        : Math.min(total_count, 1000) * STAR_BANDS.length

      setState(s => ({
        ...s,
        loading: false,
        repos: items,
        loadedCount: items.length,
        totalCount: estimatedTotal,
        hasMore: true,
        currentBand: 0,
        currentSlice: 0,
        mode: 'normal',
      }))
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return
      setState(s => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'Bilinmeyen hata', repos: [] }))
    }
  }, [])

  // "Daha fazla yükle" — bir sonraki banda/dilime geç
  const loadMore = useCallback(async () => {
    if (!configRef.current) return
    const config = configRef.current

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setState(s => ({ ...s, loading: true, error: '' }))

    try {
      const signal = abortRef.current.signal
      const currentState = await new Promise<SearchState>(resolve => {
        setState(s => { resolve(s); return s })
      })

      let nextBand = currentState.currentBand
      let nextSlice = currentState.currentSlice
      let queries: string[]
      let hasMore = true

      if (config.isTrending) {
        // Zaman dilimini ilerlet
        nextSlice = currentState.currentSlice + 1
        if (nextSlice > 11) {
          // 12 dilim bitti, tükenme
          setState(s => ({ ...s, loading: false, hasMore: false }))
          return
        }
        const timeFilter = buildTimeSlices(config.trendPeriod || 'week', nextSlice)
        const base = `${timeFilter} stars:>5`
        queries = buildCategoryQueries(config.categoryId, base)
        hasMore = nextSlice < 11
      } else {
        // Önce aynı bantta sonraki sayfa dene, sonra sonraki banda geç
        // Basit strateji: her loadMore bir sonraki banda geç
        nextBand = currentState.currentBand + 1
        if (nextBand >= STAR_BANDS.length) {
          setState(s => ({ ...s, loading: false, hasMore: false }))
          return
        }
        const band = STAR_BANDS[nextBand]
        const base = config.query ? `${config.query} ${band}` : band
        queries = buildCategoryQueries(config.categoryId, base)
        hasMore = nextBand < STAR_BANDS.length - 1
      }

      const { items } = await fetchParallel(queries, 1, config.sort, signal)

      setState(s => ({
        ...s,
        loading: false,
        repos: mergeUnique(s.repos, items),
        loadedCount: s.loadedCount + items.length,
        currentBand: nextBand,
        currentSlice: nextSlice,
        hasMore: hasMore && items.length > 0,
      }))
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return
      setState(s => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'Hata' }))
    }
  }, [])

  const clear = useCallback(() => {
    abortRef.current?.abort()
    configRef.current = null
    setState({ repos: [], loading: false, error: '', totalCount: 0, loadedCount: 0, hasMore: false, currentBand: 0, currentSlice: 0, mode: 'normal' })
  }, [])

  return { ...state, search, loadMore, clear }
}
