// src/components/RepoCard.tsx
import type { Repo } from '../types'
import { CATEGORIES, LANG_COLORS } from '../lib/constants'
import { detectCategory, formatNumber, timeAgo } from '../lib/utils'

interface Props {
  repo: Repo
  onAnalyze: (repo: Repo) => void
}

export function RepoCard({ repo, onAnalyze }: Props) {
  const catId = detectCategory(repo)
  const cat = CATEGORIES.find(c => c.id === catId) || CATEGORIES[0]
  const langColor = repo.language ? (LANG_COLORS[repo.language] || '#888') : null

  return (
    <div className="repo-card">
      <div className="repo-card-header">
        <div className="repo-name-block">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="repo-name-link"
          >
            <img
              src={repo.owner.avatar_url}
              alt={repo.owner.login}
              className="owner-avatar"
            />
            {repo.full_name}
          </a>
          <span className="repo-category">
            {cat.icon} {cat.label}
          </span>
        </div>
        <button className="ai-btn" onClick={() => onAnalyze(repo)}>
          ✦ AI Analiz
        </button>
      </div>

      <p className="repo-description">
        {repo.description || 'Açıklama yok.'}
      </p>

      {repo.topics.length > 0 && (
        <div className="topic-list">
          {repo.topics.slice(0, 4).map(t => (
            <span key={t} className="topic-tag">{t}</span>
          ))}
          {repo.topics.length > 4 && (
            <span className="topic-more">+{repo.topics.length - 4}</span>
          )}
        </div>
      )}

      <div className="repo-meta">
        <div className="repo-meta-left">
          {langColor && (
            <span className="lang-badge">
              <span className="lang-dot" style={{ background: langColor }} />
              {repo.language}
            </span>
          )}
          <span className="meta-stat">⭐ {formatNumber(repo.stargazers_count)}</span>
          <span className="meta-stat">🍴 {formatNumber(repo.forks_count)}</span>
          {repo.open_issues_count > 0 && (
            <span className="meta-stat">● {formatNumber(repo.open_issues_count)} issue</span>
          )}
        </div>
        <span className="repo-updated">{timeAgo(repo.updated_at)}</span>
      </div>
    </div>
  )
}
