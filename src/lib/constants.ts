// src/lib/constants.ts
import type { Category } from '../types'

export const CATEGORIES: Category[] = [
  {
    id: 'all',
    label: 'Tümü',
    icon: '⊞',
    keywords: [],
  },
  {
    id: 'ai',
    label: 'AI / ML',
    icon: '🧠',
    keywords: ['machine-learning', 'deep-learning', 'neural', 'llm', 'gpt', 'ai', 'ml', 'pytorch', 'tensorflow', 'transformers', 'langchain', 'nlp', 'diffusion', 'rag', 'huggingface'],
  },
  {
    id: 'web',
    label: 'Web',
    icon: '🌐',
    keywords: ['react', 'vue', 'svelte', 'nextjs', 'frontend', 'css', 'javascript', 'typescript', 'tailwind', 'nodejs', 'express', 'fastapi', 'django', 'web'],
  },
  {
    id: 'devtools',
    label: 'DevTools',
    icon: '🔧',
    keywords: ['cli', 'compiler', 'linter', 'formatter', 'debugger', 'vscode', 'neovim', 'terminal', 'git', 'devtools', 'tooling', 'build'],
  },
  {
    id: 'security',
    label: 'Security',
    icon: '🔒',
    keywords: ['security', 'ctf', 'pentest', 'exploit', 'vulnerability', 'encryption', 'crypto', 'auth', 'firewall', 'malware', 'forensics'],
  },
  {
    id: 'mobile',
    label: 'Mobile',
    icon: '📱',
    keywords: ['android', 'ios', 'flutter', 'react-native', 'swift', 'kotlin', 'mobile', 'cross-platform'],
  },
  {
    id: 'data',
    label: 'Data',
    icon: '🗄️',
    keywords: ['database', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'analytics', 'etl', 'pipeline', 'spark', 'kafka', 'pandas', 'sql'],
  },
  {
    id: 'infra',
    label: 'Infra / Cloud',
    icon: '☁️',
    keywords: ['kubernetes', 'terraform', 'ansible', 'cloud', 'aws', 'gcp', 'azure', 'serverless', 'microservices', 'devops', 'docker', 'helm'],
  },
]

export const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#fa7343',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Shell: '#89e051',
  Lua: '#000080',
  Zig: '#ec915c',
  Nix: '#7e7eff',
}

export const PER_PAGE = 18
export const PROXY_BASE = 'http://localhost:3001'
