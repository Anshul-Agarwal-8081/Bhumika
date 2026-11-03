import { Router } from 'express'
import { z } from 'zod'
import { createSupabaseClient } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { generateRoadmap, resourceSchema, searchLearning } from '../services/learning.js'

export const learningRouter = Router()
const searchInput = z.object({ query: z.string().trim().min(2).max(160) }).strict()
const pageInput = z.coerce.number().int().min(1).default(1)

learningRouter.post('/search', async (req, res, next) => {
  const parsed = searchInput.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Enter a topic between 2 and 160 characters.' } }); return }
  try {
    const result = await searchLearning(parsed.data.query)
    const token = req.header('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (token) {
      const client = createSupabaseClient(token)
      const { data, error } = await client.auth.getUser(token)
      if (error || !data.user) { res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Your session is invalid or expired.' } }); return }
      await client.from('learning_searches').insert({ user_id: data.user.id, query: parsed.data.query, results: result.resources }).throwOnError()
    }
    res.json(result)
  } catch (error) { next(error) }
})

learningRouter.post('/roadmap', requireAuth, async (req, res, next) => {
  const parsed = z.object({ query: z.string().trim().min(2).max(160), level: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner') }).strict().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Roadmap input is invalid.' } }); return }
  try {
    const client = createSupabaseClient(req.accessToken)
    const discovered = await searchLearning(parsed.data.query)
    const resources = discovered.resources
    const { error: searchError } = await client.from('learning_searches').insert({ user_id: req.user!.id, query: parsed.data.query, results: resources })
    if (searchError) throw searchError
    const roadmap = await generateRoadmap(parsed.data.query, parsed.data.level, resources)
    const metadata = { difficulty: roadmap.difficulty, estimatedTotalDuration: roadmap.estimatedTotalDuration, resources }
    const { data, error } = await client.from('learning_roadmaps').insert({ user_id: req.user!.id, title: roadmap.title, query: parsed.data.query, topics: roadmap.topics, metadata }).select('id,title,query,topics,metadata,created_at,updated_at').single()
    if (error) throw error
    res.status(201).json({ roadmap: { ...data, difficulty: roadmap.difficulty, estimatedTotalDuration: roadmap.estimatedTotalDuration }, resources })
  } catch (error) { next(error) }
})

learningRouter.get('/history', requireAuth, async (req, res, next) => {
  const page = pageInput.safeParse(req.query.page)
  if (!page.success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Page must be a positive integer.' } }); return }
  try { const { data, error } = await createSupabaseClient(req.accessToken).from('learning_searches').select('id,query,created_at').eq('user_id', req.user!.id).order('created_at', { ascending: false }).range((page.data - 1) * 20, page.data * 20 - 1); if (error) throw error; res.json({ searches: data }) } catch (error) { next(error) }
})
learningRouter.get('/saved', requireAuth, async (req, res, next) => {
  try { const { data, error } = await createSupabaseClient(req.accessToken).from('saved_resources').select('id,resource,created_at').eq('user_id', req.user!.id).order('created_at', { ascending: false }); if (error) throw error; res.json({ resources: data }) } catch (error) { next(error) }
})
learningRouter.post('/save', requireAuth, async (req, res, next) => {
  const parsed = resourceSchema.safeParse(req.body?.resource)
  if (!parsed.success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Resource is invalid.' } }); return }
  try {
    const client = createSupabaseClient(req.accessToken)
    const { data: existing, error: lookupError } = await client.from('saved_resources').select('id,resource,created_at').eq('user_id', req.user!.id).contains('resource', { url: parsed.data.url }).maybeSingle()
    if (lookupError) throw lookupError
    if (existing) { res.json({ saved: existing }); return }
    const { data, error } = await client.from('saved_resources').insert({ user_id: req.user!.id, resource: parsed.data }).select('id,resource,created_at').single()
    if (error?.code === '23505') {
      const { data: duplicate, error: duplicateError } = await client.from('saved_resources').select('id,resource,created_at').eq('user_id', req.user!.id).contains('resource', { url: parsed.data.url }).maybeSingle()
      if (duplicateError) throw duplicateError
      if (duplicate) { res.json({ saved: duplicate }); return }
    }
    if (error) throw error
    res.status(201).json({ saved: data })
  } catch (error) { next(error) }
})
learningRouter.delete('/save/:id', requireAuth, async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Saved resource id is invalid.' } }); return }
  try { const { error, count } = await createSupabaseClient(req.accessToken).from('saved_resources').delete({ count: 'exact' }).eq('id', req.params.id).eq('user_id', req.user!.id); if (error) throw error; if (!count) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Saved resource was not found.' } }); return } res.status(204).end() } catch (error) { next(error) }
})
learningRouter.get('/roadmaps', requireAuth, async (req, res, next) => {
  try { const { data, error } = await createSupabaseClient(req.accessToken).from('learning_roadmaps').select('id,title,query,topics,created_at,updated_at').eq('user_id', req.user!.id).order('updated_at', { ascending: false }); if (error) throw error; res.json({ roadmaps: data }) } catch (error) { next(error) }
})
learningRouter.get('/roadmaps/:id', requireAuth, async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Roadmap id is invalid.' } }); return }
  try {
    const client = createSupabaseClient(req.accessToken)
    const { data, error } = await client.from('learning_roadmaps').select('id,title,query,topics,metadata,created_at,updated_at').eq('id', req.params.id).eq('user_id', req.user!.id).maybeSingle()
    if (error) throw error
    if (!data) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Roadmap was not found.' } }); return }
    const metadata = data.metadata && typeof data.metadata === 'object' ? data.metadata as { difficulty?: string; estimatedTotalDuration?: string; resources?: unknown } : {}
    const resourceResult = z.array(resourceSchema).max(30).safeParse(metadata.resources)
    const resources = resourceResult.success ? resourceResult.data : []
    res.json({ roadmap: { ...data, difficulty: metadata.difficulty ?? 'Beginner', estimatedTotalDuration: metadata.estimatedTotalDuration ?? '', metadata: undefined }, resources })
  } catch (error) { next(error) }
})
learningRouter.delete('/roadmaps/:id', requireAuth, async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Roadmap id is invalid.' } }); return }
  try { const { error, count } = await createSupabaseClient(req.accessToken).from('learning_roadmaps').delete({ count: 'exact' }).eq('id', req.params.id).eq('user_id', req.user!.id); if (error) throw error; if (!count) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Roadmap was not found.' } }); return } res.status(204).end() } catch (error) { next(error) }
})
learningRouter.patch('/topics/:id/progress', requireAuth, async (req, res, next) => {
  if (typeof req.params.id !== 'string' || !/^[a-f0-9]{16}$/i.test(req.params.id)) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Roadmap topic id is invalid.' } }); return }
  const parsed = z.object({ roadmapId: z.string().uuid(), completed: z.boolean() }).strict().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Topic progress input is invalid.' } }); return }
  try {
    const client = createSupabaseClient(req.accessToken)
    const { data, error } = await client.from('learning_roadmaps').select('topics').eq('id', parsed.data.roadmapId).eq('user_id', req.user!.id).maybeSingle()
    if (error) throw error
    if (!data) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Roadmap was not found.' } }); return }
    if (!Array.isArray(data.topics)) { res.status(409).json({ error: { code: 'INVALID_ROADMAP', message: 'This roadmap has invalid stage data.' } }); return }
    const topics = (data.topics as { id?: string; completed?: boolean }[]).map((topic) => topic.id === req.params.id ? { ...topic, completed: parsed.data.completed } : topic)
    if (!topics.some((topic) => topic.id === req.params.id)) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Roadmap topic was not found.' } }); return }
    const updated = await client.from('learning_roadmaps').update({ topics }).eq('id', parsed.data.roadmapId).eq('user_id', req.user!.id).select('id,topics').maybeSingle()
    if (updated.error) throw updated.error
    if (!updated.data) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Roadmap was not found.' } }); return }
    res.json({ roadmap: updated.data })
  } catch (error) { next(error) }
})
