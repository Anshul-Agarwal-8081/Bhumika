export type ResourceType = 'Course' | 'Documentation' | 'Video' | 'Article'
export type PracticeType = 'scenario' | 'multiple-choice'
export type ApplicationStatus = 'Draft' | 'Ready for review' | 'Applied' | 'Interview' | 'Rejected / Closed'

export interface Skill { id: string; name: string; category: string }
export interface Resource {
  id: string; title: string; type: ResourceType; provider: string; level: string
  duration: string; priceLabel: string; url: string; sourceStatus: 'Curated demo resource'
}
export interface RoadmapModule {
  id: string; roleId: string; title: string; subtitle: string; duration: string
  skillIds: string[]; lesson: string[]; resourceIds: string[]; challengeId: string
}
export interface Role {
  id: string; title: string; category: string; description: string; level: string
  effort: string; skillIds: string[]; moduleIds: string[]; icon: string; tint: string
}
export interface RubricCriterion { label: string; max: number; hint: string }
export interface Challenge {
  id: string; roleId: string; skillId: string; title: string; type: PracticeType
  difficulty: string; prompt: string; options?: string[]; answer?: string
  rubric: RubricCriterion[]; timeLimit: string; followUp: string
}
export interface RubricResult { label: string; score: number; max: number; reason: string }
export interface Evaluation {
  score: number; rubric: RubricResult[]; strengths: string[]; gaps: string[]
  modelAnswer: string; nextTask: string; caveat: string
}
export interface Attempt {
  id: string; challengeId: string; roleId: string; answer: string; score: number
  completedAt: string; xp: number; evaluation: Evaluation
}
export interface UserSkillProgress { skillId: string; estimate: number; attempts: number; lastScore?: number }
export interface Opportunity {
  id: string; title: string; company: string; location: string; type: string
  posted: string; description: string; requirements: string[]; skills: string[]; url: string
}
export interface ResumeProfile {
  name: string; email: string; education: string; skills: string; projects: string
  experience: string; links: string
}
export interface Application {
  id: string; opportunityId: string; title: string; company: string
  status: ApplicationStatus; updatedAt: string; resumeDraft?: string; messageDraft?: string
}
export interface ArenaChallenge { code: string; challengeId: string; createdAt: string; friendScore?: number }
export interface DemoState {
  activeRoleId: string; completedModuleIds: string[]; attempts: Attempt[]
  xp: number; streak: number; arenaChallenges: ArenaChallenge[]
  applications: Application[]; profile: ResumeProfile
}
