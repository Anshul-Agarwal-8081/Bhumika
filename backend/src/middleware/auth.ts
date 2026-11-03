import type { RequestHandler } from 'express'
import { createSupabaseClient } from '../config/supabase.js'

export const requireAuth: RequestHandler = async (req, res, next) => {
  const match = req.header('authorization')?.match(/^Bearer\s+(.+)$/i)
  if (!match) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } }); return }
  try {
    const { data, error } = await createSupabaseClient().auth.getUser(match[1])
    if (error || !data.user) { res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Your session is invalid or expired.' } }); return }
    req.user = { id: data.user.id, email: data.user.email }
    req.accessToken = match[1]
    next()
  } catch (error) { next(error) }
}
