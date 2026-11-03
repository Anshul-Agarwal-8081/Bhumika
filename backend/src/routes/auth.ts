import { Router } from 'express'
import { z } from 'zod'
import { createSupabaseClient } from '../config/supabase.js'
import { createSupabaseAdminClient } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

export const authRouter = Router()
const credentials = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128) })

authRouter.post('/register', async (req, res, next) => {
  const input = credentials.safeParse(req.body)
  if (!input.success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Provide a valid email and a password with at least 8 characters.' } }); return }
  try {
    const { data, error } = await createSupabaseClient().auth.signUp(input.data)
    if (error) { res.status(400).json({ error: { code: 'REGISTRATION_FAILED', message: error.message } }); return }
    res.status(201).json({ user: data.user, session: data.session, confirmationRequired: !data.session })
  } catch (error) { next(error) }
})

authRouter.post('/login', async (req, res, next) => {
  const input = credentials.safeParse(req.body)
  if (!input.success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Provide a valid email and password.' } }); return }
  try {
    const { data, error } = await createSupabaseClient().auth.signInWithPassword(input.data)
    if (error || !data.session) { res.status(401).json({ error: { code: 'LOGIN_FAILED', message: 'Email or password was not accepted.' } }); return }
    res.json({ user: data.user, session: data.session })
  } catch (error) { next(error) }
})

authRouter.post('/refresh', async (req, res, next) => {
  const input = z.object({ refresh_token: z.string().min(20).max(2048) }).strict().safeParse(req.body)
  if (!input.success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid refresh token is required.' } }); return }
  try {
    const { data, error } = await createSupabaseClient().auth.refreshSession({ refresh_token: input.data.refresh_token })
    if (error || !data.session) { res.status(401).json({ error: { code: 'SESSION_EXPIRED', message: 'Your session expired. Please sign in again.' } }); return }
    res.json({ user: data.user, session: data.session })
  } catch (error) { next(error) }
})

authRouter.get('/me', requireAuth, (req, res) => res.json({ user: req.user }))

authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try { const { error } = await createSupabaseAdminClient().auth.admin.signOut(req.accessToken!, 'local'); if (error) throw error; res.status(204).end() } catch (error) { next(error) }
})

authRouter.post('/forgot-password', async (req, res, next) => {
  const input = z.object({ email: z.string().email().max(254) }).safeParse(req.body)
  if (!input.success) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Provide a valid email address.' } }); return }
  try {
    const { error } = await createSupabaseClient().auth.resetPasswordForEmail(input.data.email)
    if (error) throw error
    res.json({ message: 'If the account exists, password reset instructions have been requested.' })
  } catch (error) { next(error) }
})
