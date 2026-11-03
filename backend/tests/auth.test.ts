import test from 'node:test'
import assert from 'node:assert/strict'
import { createSupabaseAdminClient, createSupabaseClient } from '../src/config/supabase.js'
import { env } from '../src/config/env.js'
import { requireAuth } from '../src/middleware/auth.js'

const fakeUser = (email: string) => ({ id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email, app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', email_confirmed_at: '2026-01-01T00:00:00Z' })
const fakeSession = (email: string) => ({ access_token: 'test-access-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'test-refresh-token', user: fakeUser(email) })

test('mocked Supabase auth covers registration, login errors, session restoration and logout', async (t) => {
  const requests: { path: string; method: string }[] = []
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const raw = input instanceof Request ? input.url : String(input)
    const url = new URL(raw)
    assert.equal(url.origin, env.SUPABASE_URL)
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) as { email?: string; password?: string; refresh_token?: string } : {}
    requests.push({ path: url.pathname, method })
    if (url.pathname.endsWith('/auth/v1/signup') && method === 'POST') {
      const user = fakeUser(body.email ?? 'learner@example.test')
      if (body.email === 'confirm@example.test') return Response.json({ user, session: null }, { status: 200 })
      return Response.json({ ...fakeSession(user.email), user }, { status: 200 })
    }
    if (url.pathname.endsWith('/auth/v1/token') && method === 'POST' && url.searchParams.get('grant_type') === 'refresh_token') {
      if (body.refresh_token === 'invalid-refresh-token') return Response.json({ code: 'invalid_grant', msg: 'Refresh token not found' }, { status: 400 })
      return Response.json(fakeSession('learner@example.test'), { status: 200 })
    }
    if (url.pathname.endsWith('/auth/v1/token') && method === 'POST') {
      if (body.password === 'incorrect-password') return Response.json({ code: 'invalid_credentials', msg: 'Invalid login credentials' }, { status: 400 })
      return Response.json(fakeSession(body.email ?? 'learner@example.test'), { status: 200 })
    }
    if (url.pathname.endsWith('/auth/v1/user') && method === 'GET') {
      const authorization = input instanceof Request ? input.headers.get('authorization') : new Headers(init?.headers).get('authorization')
      if (authorization === 'Bearer invalid.expired.token') return Response.json({ message: 'Invalid token' }, { status: 401 })
      return Response.json(fakeUser('learner@example.test'), { status: 200 })
    }
    if (url.pathname.endsWith('/auth/v1/logout') && method === 'POST') return new Response(null, { status: 204 })
    throw new Error(`Unexpected mocked Auth API request: ${method} ${url.pathname}`)
  })

  const client = createSupabaseClient()
  const registration = await client.auth.signUp({ email: 'learner@example.test', password: 'correct-password' })
  assert.equal(registration.error, null)
  assert.ok(registration.data.session?.access_token)

  const emailConfirmation = await client.auth.signUp({ email: 'confirm@example.test', password: 'correct-password' })
  assert.equal(emailConfirmation.error, null)
  assert.equal(emailConfirmation.data.session, null)
  assert.ok(emailConfirmation.data.user)

  const rejected = await client.auth.signInWithPassword({ email: 'learner@example.test', password: 'incorrect-password' })
  assert.ok(rejected.error)
  assert.equal(rejected.data.session, null)

  const login = await client.auth.signInWithPassword({ email: 'learner@example.test', password: 'correct-password' })
  assert.equal(login.error, null)
  const token = login.data.session?.access_token
  assert.ok(token)
  const restored = await client.auth.getUser(token)
  assert.equal(restored.error, null)
  assert.equal(restored.data.user?.email, 'learner@example.test')
  const invalid = await client.auth.getUser('invalid.expired.token')
  assert.ok(invalid.error)
  const refreshed = await client.auth.refreshSession({ refresh_token: 'test-refresh-token' })
  assert.equal(refreshed.error, null)
  assert.ok(refreshed.data.session?.access_token)
  const rejectedRefresh = await client.auth.refreshSession({ refresh_token: 'invalid-refresh-token' })
  assert.ok(rejectedRefresh.error)

  const logout = await createSupabaseAdminClient().auth.admin.signOut(token, 'local')
  assert.equal(logout.error, null)
  assert.ok(requests.some((request) => request.path.endsWith('/auth/v1/signup')))
  assert.ok(requests.some((request) => request.path.endsWith('/auth/v1/token')))
  assert.ok(requests.some((request) => request.path.endsWith('/auth/v1/user')))
  assert.ok(requests.some((request) => request.path.endsWith('/auth/v1/logout')))
})

test('authentication middleware rejects missing and invalid tokens and sets the verified user', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const authorization = input instanceof Request ? input.headers.get('authorization') : new Headers(init?.headers).get('authorization')
    if (authorization === 'Bearer invalid.expired.token') return Response.json({ message: 'Invalid token' }, { status: 401 })
    return Response.json({ id: '11111111-1111-4111-8111-111111111111', email: 'learner@example.test' }, { status: 200 })
  })
  const response: any = { statusCode: 200, body: undefined, status(code: number) { this.statusCode = code; return this }, json(body: unknown) { this.body = body; return this } }
  const missing: any = { header: () => undefined }
  let missingNext = false
  await requireAuth(missing, response, () => { missingNext = true })
  assert.equal(response.statusCode, 401)
  assert.equal(missingNext, false)

  const invalidResponse: any = { ...response, status(code: number) { this.statusCode = code; return this }, json(body: unknown) { this.body = body; return this } }
  const invalid: any = { header: () => 'Bearer invalid.expired.token' }
  let invalidNext = false
  await requireAuth(invalid, invalidResponse, () => { invalidNext = true })
  assert.equal(invalidResponse.statusCode, 401)
  assert.equal(invalidNext, false)

  const validResponse: any = { ...response, status(code: number) { this.statusCode = code; return this }, json(body: unknown) { this.body = body; return this } }
  const valid: any = { header: () => 'Bearer live-test-token' }
  let validNext = false
  await requireAuth(valid, validResponse, () => { validNext = true })
  assert.equal(validNext, true)
  assert.equal(valid.user.email, 'learner@example.test')
  assert.equal(valid.accessToken, 'live-test-token')
})
