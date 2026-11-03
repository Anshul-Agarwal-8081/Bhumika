import test from 'node:test'
import assert from 'node:assert/strict'
import { healthRouter } from '../src/routes/health.js'
import { env, hasSupabase } from '../src/config/env.js'

test('health route returns HTTP 200 state and labels integrations as configuration only', () => {
  const layer = (healthRouter as any).stack.find((entry: any) => entry.route?.path === '/' && entry.route?.methods?.get)
  assert.ok(layer)
  const handler = layer.route.stack[0].handle as (req: unknown, res: any) => void
  const response: any = { statusCode: 200, body: undefined, status(code: number) { this.statusCode = code; return this }, json(body: unknown) { this.body = body; return this } }
  handler({}, response)
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.status, 'ok')
  assert.equal(response.body.service, 'bhumika-api')
  assert.equal(response.body.integrations.supabase, hasSupabase ? 'configured' : 'not_configured')
  assert.equal(response.body.integrations.gemini, env.GEMINI_API_KEY ? 'configured' : 'not_configured')
  assert.equal(response.body.integrations.learningSearch, env.TAVILY_API_KEY || env.YOUTUBE_API_KEY ? 'configured' : 'not_configured')
})
