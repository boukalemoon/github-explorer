// src/components/SettingsModal.tsx
import { useState, useEffect } from 'react'
import { PROXY_BASE } from '../lib/constants'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const [health, setHealth] = useState<{ hasApiKey: boolean; hasGithubToken: boolean } | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch(`${PROXY_BASE}/api/health`)
      .then(r => r.json())
      .then(d => setHealth(d))
      .catch(() => setHealth(null))
      .finally(() => setChecking(false))
  }, [])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙ Ayarlar</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <section className="settings-section">
            <h3>Proxy Sunucu Durumu</h3>
            {checking ? (
              <p className="status-checking">Kontrol ediliyor...</p>
            ) : health === null ? (
              <div className="status-error">
                <p>⚠️ Proxy sunucu çalışmıyor.</p>
                <p>Terminalde şunu çalıştır: <code>npm run server</code></p>
              </div>
            ) : (
              <div className="status-ok">
                <div className="status-row">
                  <span>Proxy Sunucu</span>
                  <span className="badge badge-ok">✅ Çalışıyor</span>
                </div>
                <div className="status-row">
                  <span>Anthropic API Key</span>
                  <span className={`badge ${health.hasApiKey ? 'badge-ok' : 'badge-warn'}`}>
                    {health.hasApiKey ? '✅ Mevcut' : '⚠️ Eksik'}
                  </span>
                </div>
                <div className="status-row">
                  <span>GitHub Token</span>
                  <span className={`badge ${health.hasGithubToken ? 'badge-ok' : 'badge-neutral'}`}>
                    {health.hasGithubToken ? '✅ Mevcut' : '— Opsiyonel'}
                  </span>
                </div>
              </div>
            )}
          </section>

          <section className="settings-section">
            <h3>Nasıl Kurulur</h3>
            <ol className="setup-steps">
              <li>
                <code>cp .env.example .env</code>
                <p>Proje klasöründe .env dosyası oluştur</p>
              </li>
              <li>
                <code>ANTHROPIC_API_KEY=sk-ant-...</code>
                <p>
                  .env dosyasına key'ini yaz.{' '}
                  <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">
                    console.anthropic.com ↗
                  </a>
                </p>
              </li>
              <li>
                <code>npm run dev</code>
                <p>Her iki sunucuyu (UI + proxy) birden başlatır</p>
              </li>
            </ol>
          </section>

          <section className="settings-section">
            <h3>GitHub Rate Limit</h3>
            <p className="settings-note">
              Token olmadan: <strong>10 istek/dakika</strong><br />
              Token ile: <strong>30 istek/dakika</strong> (ücretsiz){' '}
              <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer">
                Token oluştur ↗
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
