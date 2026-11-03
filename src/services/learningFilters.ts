import type { LearningResource } from './learningApi'

export type ResourceFilters = { type: string; level: string; access: string; source: string; language: string; duration?: string; sort: string }

function durationMinutes(value: string | null) {
  const range = value?.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?|days?)/i)
  if (range) {
    const factor = /day/i.test(range[3]) ? 1440 : /hour|hr/i.test(range[3]) ? 60 : 1
    return (Number(range[1]) + Number(range[2])) / 2 * factor
  }
  const match = value?.match(/\d+(?:\.\d+)?/)
  if (!match) return null
  const count = Number(match[0])
  return /day/i.test(value ?? '') ? count * 1440 : /hour|hr/i.test(value ?? '') ? count * 60 : count
}

function minutes(value: string | null) { return durationMinutes(value) ?? Number.POSITIVE_INFINITY }

export function filterLearningResources(resources: LearningResource[], filters: ResourceFilters) {
  const levelRank = { Beginner: 0, Intermediate: 1, Advanced: 2 }
  return resources.filter((r) =>
    (filters.type === 'All types' || r.type === filters.type) &&
    (filters.level === 'All levels' || r.level === filters.level) &&
    (filters.access === 'Any access' || r.freeAccess === filters.access) &&
    (filters.source === 'All sources' || r.source === filters.source) &&
    (filters.language === 'All languages' || r.language === filters.language) &&
    (filters.duration === undefined || filters.duration === 'Any duration' || (filters.duration === 'Under 30 minutes' && durationMinutes(r.estimatedTime) !== null && minutes(r.estimatedTime) < 30) || (filters.duration === '30–120 minutes' && durationMinutes(r.estimatedTime) !== null && minutes(r.estimatedTime) >= 30 && minutes(r.estimatedTime) <= 120) || (filters.duration === 'Over 2 hours' && durationMinutes(r.estimatedTime) !== null && minutes(r.estimatedTime) > 120))
  ).sort((a, b) => {
    if (filters.sort === 'Beginner friendly') return levelRank[a.level] - levelRank[b.level]
    if (filters.sort === 'Advanced') return levelRank[b.level] - levelRank[a.level]
    if (filters.sort === 'Shortest duration') return minutes(a.estimatedTime) - minutes(b.estimatedTime)
    return 0
  })
}
