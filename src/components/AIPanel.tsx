// src/components/AIPanel.tsx
import { useState, useEffect, useRef } from 'react'
import type { Repo, AIMessage } from '../types'
import { useAI } from '../hooks/useAI'
import { formatNumber } from '../lib/utils'

interface Props {
  repo: Repo
  onClose: () => void
}

export function AIPanel({ repo, onClose }: Props) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const { loading, hasKey, checkHealth, chat } = useAI()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkHealth().then(health => {
      if (health?.hasApiKey) runInitialAnalysis()
    })
  }, [repo.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function runInitialAnalysis() {
    const system = `Sen bir GitHub repository analiz uzmanısın. Türkçe yanıt ver. Kısa ve net ol. Madde madde yaz.`
    const content = `Bu GitHub reposunu analiz et:
- İsim: ${repo.full_name}
- Açıklama: ${repo.description || 'yok'}
- Dil: ${repo.language || 'belirtilmemiş'}
- Yıldız: ${formatNumber(repo.stargazers_count)} | Fork: ${formatNumber(repo.forks_count)}
- Topics: ${repo.topics.join(', ') || 'yok'}
- Son güncelleme: ${repo.updated_at}

Şunları söyle:
1. Projenin amacı (1-2 cümle)
2. Kimler için uygun
3. Aktiflik ve topluluk durumu
4. Öne çıkan özellikler veya dikkat edilecek noktalar`

    const reply = await chat([{ role: 'user', content }], system)
    if (reply) setMessages([{ role: 'assistant', content: reply }])
  }

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')

    const newMessages: AIMessage[] = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)

    const system = `Sen bir GitHub uzmanısın. ${repo.full_name} reposunu inceliyorsun. Türkçe, kısa ve net yanıt ver.`
    const reply = await chat(newMessages, system)
    if (reply) setMessages(prev => [...prev, { role: 'assistant', content: reply }])
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="ai-panel">
      {/* Header */}
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <span className="ai-icon">✦</span>
          <div>
            <div className="ai-panel-repo">{repo.name}</div>
            <div className="ai-panel-sub">AI Analiz Ajanı</div>
          </div>
        </div>
        <button className="close-btn" onClick={onClose} title="Kapat">✕</button>
      </div>

      {/* Repo quick stats */}
      <div className="ai-panel-stats">
        <span>⭐ {formatNumber(repo.stargazers_count)}</span>
        <span>🍴 {formatNumber(repo.forks_count)}</span>
        {repo.language && <span>📝 {repo.language}</span>}
        <a href={repo.html_url} target="_blank" rel="noreferrer" className="gh-link">GitHub ↗</a>
      </div>

      {/* Messages */}
      <div className="ai-messages">
        {hasKey === false && (
          <div className="ai-no-key">
            <p>⚠️ Anthropic API key bulunamadı.</p>
            <p>
              <strong>.env</strong> dosyasına <code>ANTHROPIC_API_KEY</code> ekle,
              ardından <code>npm run server</code> komutunu yeniden başlat.
            </p>
            <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">
              Key almak için → console.anthropic.com ↗
            </a>
          </div>
        )}

        {hasKey === true && messages.length === 0 && loading && (
          <div className="ai-typing">
            <span className="dot" /><span className="dot" /><span className="dot" />
            Analiz ediliyor...
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`ai-message ai-message--${m.role}`}>
            <span className="message-label">
              {m.role === 'user' ? '👤 Sen' : '✦ AI Ajan'}
            </span>
            <div className="message-content">{m.content}</div>
          </div>
        ))}

        {loading && messages.length > 0 && (
          <div className="ai-typing">
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="ai-input-area">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={hasKey ? 'Bu repo hakkında soru sor...' : 'API key gerekli'}
          disabled={!hasKey || loading}
          className="ai-input"
        />
        <button
          onClick={sendMessage}
          disabled={!hasKey || loading || !input.trim()}
          className="ai-send-btn"
        >
          ↑
        </button>
      </div>
    </div>
  )
}
