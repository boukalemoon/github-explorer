// src/App.tsx
import { useState, useEffect, useRef } from 'react'
import { useGitHub } from './hooks/useGitHub'
import { useAI } from './hooks/useAI'
import { RepoCard } from './components/RepoCard'
import { AIPanel } from './components/AIPanel'
import { SettingsModal } from './components/SettingsModal'
import { CATEGORIES } from './lib/constants'
import type { Repo, CategoryId, SortOption, TrendPeriod, AISuggestion } from './types'

// Yıldız bandı etiketleri — kullanıcıya hangi havuzda olduğunu gösterir
const BAND_LABELS = ['50k+ ⭐', '10k–50k ⭐', '1k–10k ⭐', '100–1k ⭐', '10–99 ⭐', '<10 ⭐']
const SLICE_LABELS = (p: string) => p === 'day' ? 'gün' : p === 'week' ? 'hafta' : 'ay'

export default function App() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all')
  const [sortBy, setSortBy] = useState<SortOption>('stars')
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('week')
  const [mode, setMode] = useState<'trending' | 'search'>('trending')
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [suggLoading, setSuggLoading] = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    repos, loading, error,
    totalCount, loadedCount, hasMore,
    currentBand, currentSlice,
    search, loadMore,
  } = useGitHub()

  const { getSuggestions } = useAI()

  // Arama config yardımcısı
  function buildConfig(q: string, m: 'trending' | 'search') {
    return {
      query: q,
      sort: sortBy,
      categoryId: activeCategory,
      isTrending: m === 'trending',
      trendPeriod,
    }
  }

  // İlk yükleme ve filtre değişimlerinde
  useEffect(() => {
    if (mode === 'trending') {
      search(buildConfig('', 'trending'))
    }
  }, [mode, trendPeriod, activeCategory, sortBy])

  function handleQueryChange(val: string) {
    setQuery(val)
    if (!val.trim()) {
      setMode('trending')
      return
    }
    setMode('search')
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      search(buildConfig(val, 'search'))
    }, 450)
  }

  function handleCategoryChange(id: CategoryId) {
    setActiveCategory(id)
    if (mode === 'search' && query.trim()) {
      search({ query, sort: sortBy, categoryId: id, isTrending: false })
    }
  }

  async function handleAISuggestions() {
    setSuggLoading(true)
    setAiSuggestions([])
    const results = await getSuggestions(activeCategory)
    setAiSuggestions(results)
    setSuggLoading(false)
  }

  // Daha fazla yükle butonuna ne yazdıracağız
  function loadMoreLabel() {
    if (loading) return '↻ Yükleniyor...'
    if (mode === 'trending') {
      return `Daha fazla yükle  (${currentSlice + 2}. ${SLICE_LABELS(trendPeriod)} →)`
    }
    const nextBand = BAND_LABELS[currentBand + 1]
    return nextBand ? `Daha fazla yükle  (${nextBand} havuzu →)` : 'Daha fazla yükle'
  }

  // Hangi havuzda olduğumuzu gösteren badge
  function currentPoolLabel() {
    if (mode === 'trending') {
      return `${currentSlice + 1}. ${SLICE_LABELS(trendPeriod)}`
    }
    return BAND_LABELS[currentBand] || ''
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo">⬡ GitHub Explorer</span>
          <span className="logo-sub">AI destekli repository keşif</span>
        </div>
        <div className="topbar-right">
          <button className="btn btn-ai" onClick={handleAISuggestions} disabled={suggLoading}>
            {suggLoading ? '...' : '✦ AI Öneri'}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowSettings(true)}>⚙</button>
        </div>
      </header>

      <div className={`layout ${selectedRepo ? 'layout--panel' : ''}`}>
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input
              className="search-input"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder="Ara... (react, llm, cli...)"
            />
            {query && (
              <button className="search-clear" onClick={() => handleQueryChange('')}>✕</button>
            )}
          </div>

          <div className="filter-group">
            <label className="filter-label">Dönem</label>
            <div className="filter-pills">
              {(['day', 'week', 'month'] as TrendPeriod[]).map(p => (
                <button
                  key={p}
                  className={`pill ${trendPeriod === p && mode === 'trending' ? 'pill--active' : ''}`}
                  onClick={() => { setTrendPeriod(p); setMode('trending'); setQuery('') }}
                >
                  {p === 'day' ? 'Bugün' : p === 'week' ? 'Bu hafta' : 'Bu ay'}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Sırala</label>
            <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}>
              <option value="stars">⭐ En çok yıldız</option>
              <option value="forks">🍴 En çok fork</option>
              <option value="updated">🕐 Son güncelleme</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Kategori</label>
            <div className="category-list">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`category-btn ${activeCategory === cat.id ? 'category-btn--active' : ''}`}
                  onClick={() => handleCategoryChange(cat.id)}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Deep search durumu */}
          {repos.length > 0 && (
            <div className="deep-status">
              <div className="deep-status-title">Keşif Durumu</div>
              <div className="deep-progress-bar">
                <div
                  className="deep-progress-fill"
                  style={{
                    width: `${Math.min(100, (loadedCount / Math.max(totalCount, 1)) * 100).toFixed(0)}%`
                  }}
                />
              </div>
              <div className="deep-status-row">
                <span>{loadedCount.toLocaleString()} yüklendi</span>
                <span>~{totalCount.toLocaleString()} toplam</span>
              </div>
              <div className="deep-pool-badge">
                Havuz: {currentPoolLabel()}
              </div>
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="main">
          {/* Status bar */}
          <div className="status-bar">
            {loading && repos.length === 0 && <span className="status-loading">↻ Yükleniyor...</span>}
            {error && <span className="status-error">⚠ {error}</span>}
            {!loading && !error && repos.length > 0 && (
              <span className="status-count">
                {mode === 'trending' ? '🔥 Trend' : '🔍 Arama'} · {loadedCount.toLocaleString()} repo yüklendi · ~{totalCount.toLocaleString()} erişilebilir
              </span>
            )}
          </div>

          {/* AI Suggestions */}
          {aiSuggestions.length > 0 && (
            <div className="suggestions-bar">
              <span className="suggestions-title">✦ AI Önerileri</span>
              <div className="suggestions-list">
                {aiSuggestions.map((s, i) => (
                  <div key={i} className="suggestion-card">
                    <div className="suggestion-name">⬡ {s.name}</div>
                    <div className="suggestion-reason">{s.reason}</div>
                  </div>
                ))}
              </div>
              <button className="suggestions-close" onClick={() => setAiSuggestions([])}>✕</button>
            </div>
          )}

          {/* Repo grid */}
          <div className="repo-grid">
            {repos.map(repo => (
              <RepoCard key={repo.id} repo={repo} onAnalyze={setSelectedRepo} />
            ))}
          </div>

          {!loading && repos.length === 0 && !error && (
            <div className="empty-state">
              <div className="empty-icon">◯</div>
              <p>Sonuç bulunamadı.</p>
            </div>
          )}

          {/* Load more */}
          {(hasMore || loading) && repos.length > 0 && (
            <div className="load-more-wrap">
              {loading && repos.length > 0 && (
                <div className="load-more-hint">
                  ↻ Yeni havuz taranıyor...
                </div>
              )}
              {!loading && hasMore && (
                <>
                  <div className="load-more-hint">
                    {mode === 'search'
                      ? `${BAND_LABELS[currentBand]} havuzu tarandı. Sonraki: ${BAND_LABELS[currentBand + 1] || 'son havuz'}`
                      : `${currentSlice + 1}. zaman dilimi tamamlandı.`
                    }
                  </div>
                  <button className="load-more-btn" onClick={loadMore}>
                    {loadMoreLabel()}
                  </button>
                </>
              )}
              {!loading && !hasMore && repos.length > 0 && (
                <div className="load-more-hint exhausted">
                  ✓ Tüm havuzlar tarandı — {loadedCount.toLocaleString()} repo yüklendi
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {selectedRepo && <AIPanel repo={selectedRepo} onClose={() => setSelectedRepo(null)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
