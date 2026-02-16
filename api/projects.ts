import type { VercelRequest, VercelResponse } from '@vercel/node'

interface Project {
  id: string
  name: string
  description: string
  status: 'active' | 'paused' | 'planning'
  techStack: string[]
  color: string
  icon: string
  repoUrl?: string
  deployUrl?: string
}

// Dette er backend endpoint der returnerer projekter
// I fremtiden kan dette integreres med Gateway API eller database
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Hardcoded projekter for nu
    // TODO: Integrer med Gateway API eller scan workspace
    const projects: Project[] = [
      {
        id: 'mission-kontrol',
        name: 'Mission Kontrol',
        description: 'AI-assisteret dashboard og kontrolpanel til OpenClaw Gateway. React + TypeScript + Tailwind med live data streaming.',
        status: 'active',
        techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'Vercel'],
        color: '#007AFF',
        icon: 'chart-bar',
        repoUrl: 'https://github.com/MartinSarvio/Mission-Kontrol',
        deployUrl: 'https://mission-kontrol.vercel.app',
      },
      {
        id: 'flow',
        name: 'Flow',
        description: 'Alt-i-én restaurationsplatform med bordreservationer, online ordering, marketing automation og gæsteanalyse.',
        status: 'paused',
        techStack: ['Vanilla JS', 'Supabase', 'Vite', 'PostgreSQL'],
        color: '#FF6B35',
        icon: 'utensils',
        repoUrl: 'https://github.com/MartinSarvio/OrderFlow-AI-Complete',
        deployUrl: 'https://flow-lime-rho.vercel.app',
      },
    ]

    res.status(200).json({
      ok: true,
      projects,
      count: projects.length,
    })
  } catch (error: any) {
    console.error('Projects API error:', error)
    res.status(500).json({
      ok: false,
      error: error.message || 'Failed to fetch projects',
    })
  }
}
