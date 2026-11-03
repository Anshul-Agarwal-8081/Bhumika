import { Router } from 'express'
import { z } from 'zod'
import { createSupabaseClient } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

export const profileRouter = Router()
const profileInput = z.object({
  full_name: z.string().trim().max(100).optional(),
  education: z.string().trim().max(300).optional(),
  target_role: z.string().trim().max(120).optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(80).optional(),
  public_arena_profile: z.boolean().optional(),
}).strict()

profileRouter.use(requireAuth)
profileRouter.get('/', async (req, res, next) => {
  try {
    const client = createSupabaseClient(req.accessToken)
    const { data, error } = await client.from('profiles').select('id, full_name, education, target_role, skills, public_arena_profile, created_at, updated_at').eq('id', req.user!.id).maybeSingle()
    if (error) throw error
    res.json({ profile: data })
  } catch (error) { next(error) }
})

profileRouter.put('/', async (req, res, next) => {
  const parsed = profileInput.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Profile fields did not pass validation.' } }); return }
  try {
    const client = createSupabaseClient(req.accessToken)
    const { data, error } = await client.from('profiles').upsert({ id: req.user!.id, ...parsed.data }, { onConflict: 'id' }).select('id, full_name, education, target_role, skills, public_arena_profile, created_at, updated_at').single()
    if (error) throw error
    res.json({ profile: data })
  } catch (error) { next(error) }
})
