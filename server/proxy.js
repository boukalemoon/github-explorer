// server/proxy.js
// Anthropic API proxy - API key'i frontend'den gizlemek için
// npm run server ile başlatılır, npm run dev zaten otomatik başlatır

import express from 'express'
import cors from 'cors'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// .env dosyasını manuel oku (dotenv olmadan)
function loadEnv() {
  const envPath = join(__dirname, '..', '.env')
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim()
    }
  }
}

loadEnv()

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

const PORT = 3001

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    hasGithubToken: !!process.env.GITHUB_TOKEN,
  })
})

// Anthropic API proxy
app.post('/api/ai/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return res.status(401).json({
      error: 'ANTHROPIC_API_KEY bulunamadı. .env dosyasını kontrol et.',
    })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        ...req.body,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GitHub token proxy (opsiyonel - rate limit için)
app.get('/api/github/*', async (req, res) => {
  const path = req.params[0]
  const query = new URLSearchParams(req.query).toString()
  const url = `https://api.github.com/${path}${query ? '?' + query : ''}`

  const headers = {
    Accept: 'application/vnd.github.mercy-preview+json',
    'User-Agent': 'github-explorer-app',
  }

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  try {
    const response = await fetch(url, { headers })
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`\n🚀 GitHub Explorer Proxy Server`)
  console.log(`   Port     : http://localhost:${PORT}`)
  console.log(`   AI key   : ${process.env.ANTHROPIC_API_KEY ? '✅ Bulundu' : '⚠️  Yok (.env ekle)'}`)
  console.log(`   GH token : ${process.env.GITHUB_TOKEN ? '✅ Bulundu' : '— (opsiyonel)'}`)
  console.log(`\n   UI için ayrı terminalde: npm run dev:ui\n`)
})
