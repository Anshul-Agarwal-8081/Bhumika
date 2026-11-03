import type { LucideIcon } from 'lucide-react'
import { Brain, BriefcaseBusiness, Code2, Database, MessagesSquare, Network, Puzzle, Server } from 'lucide-react'

export interface ArenaCategory {
  id: string
  label: string
  description: string
  icon: LucideIcon
  challengeIds: string[]
}

// This metadata is intentionally separate from Arena UI so the local question bank is easy to extend.
export const arenaCategories: ArenaCategory[] = [
  { id: 'dsa', label: 'DSA & problem solving', description: 'Break down a problem, choose an approach, and explain trade-offs.', icon: Brain, challengeIds: ['array-pair'] },
  { id: 'frontend', label: 'Frontend development', description: 'React, browser behavior, accessibility, and interface reliability.', icon: Code2, challengeIds: ['loading-states', 'async-error-quiz', 'async-search', 'react-list'] },
  { id: 'backend', label: 'Backend development', description: 'Design APIs that are clear, safe, and resilient.', icon: Server, challengeIds: ['api-design'] },
  { id: 'fundamentals', label: 'Programming fundamentals', description: 'Practice core reasoning and explain your choices.', icon: Puzzle, challengeIds: ['array-pair', 'async-error-quiz'] },
  { id: 'database', label: 'Database & SQL', description: 'Work with joins, aggregation, and trustworthy analysis.', icon: Database, challengeIds: ['sql-aggregation', 'sql-join-review', 'metric-drop'] },
  { id: 'oop', label: 'Object-oriented programming', description: 'Model responsibilities and keep design straightforward.', icon: Network, challengeIds: ['oop-library'] },
  { id: 'projects', label: 'Projects & technical discussion', description: 'Explain architecture, debugging, and engineering trade-offs.', icon: BriefcaseBusiness, challengeIds: ['react-list', 'api-design'] },
  { id: 'behavioral', label: 'HR & behavioral interviews', description: 'Communicate your real experience with clarity and reflection.', icon: MessagesSquare, challengeIds: ['behavioral-setback'] },
]

export const arenaTopics: Record<string, string> = {
  'async-error-quiz': 'Async JavaScript', 'loading-states': 'UI states', 'async-search': 'Race conditions',
  'react-list': 'Component identity', 'sql-aggregation': 'Aggregation grain', 'sql-join-review': 'Join behavior',
  'metric-drop': 'Analytical reasoning', 'array-pair': 'Arrays & lookup', 'api-design': 'API design',
  'oop-library': 'Object modeling', 'behavioral-setback': 'Structured communication',
}

export const arenaXpReward = 25

