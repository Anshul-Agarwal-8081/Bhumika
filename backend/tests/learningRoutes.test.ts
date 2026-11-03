import test from 'node:test'
import assert from 'node:assert/strict'
import { learningRouter } from '../src/routes/learning.js'

const userA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const userB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const roadmapId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const resourceId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const topicId = '1234567890abcdef'

function handler(path: string, method: string) {
  const layer = (learningRouter as any).stack.find((entry: any) => entry.route?.path === path && entry.route?.methods?.[method])
  assert.ok(layer, `missing ${method.toUpperCase()} ${path} route`)
  return layer.route.stack.at(-1).handle as (req: any, res: any, next: (error?: unknown) => void) => Promise<void>
}

async function invoke(path: string, method: string, req: Record<string, any>) {
  const response: any = {
    statusCode: 200, body: undefined, ended: false,
    status(code: number) { this.statusCode = code; return this },
    json(body: unknown) { this.body = body; return this },
    end() { this.ended = true; return this },
  }
  let nextError: unknown
  await handler(path, method)({ user: { id: userA }, accessToken: 'test-access-token', ...req }, response, (error) => { nextError = error })
  if (nextError) throw nextError
  return response
}

function mockRest(t: test.TestContext, respond: (url: URL, method: string, init?: RequestInit) => Response | Promise<Response>) {
  const requests: { url: URL; method: string; init?: RequestInit }[] = []
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
    requests.push({ url, method, init })
    return respond(url, method, init)
  })
  return requests
}

test('saved resource reads and deletes always include the authenticated owner filter', async (t) => {
  const requests = mockRest(t, async (url, method) => {
    assert.equal(url.pathname.endsWith('/saved_resources'), true)
    if (method === 'GET') return Response.json([])
    return new Response(null, { status: 204, headers: { 'content-range': '*/0' } })
  })
  const saved = await invoke('/saved', 'get', {})
  assert.equal(saved.statusCode, 200)
  assert.match(requests[0].url.searchParams.get('user_id') ?? '', new RegExp(`eq\\.${userA}`))

  const deleted = await invoke('/save/:id', 'delete', { params: { id: resourceId }, user: { id: userB } })
  assert.equal(deleted.statusCode, 404)
  assert.equal(requests[1].method, 'DELETE')
  assert.equal(requests[1].url.searchParams.get('id'), `eq.${resourceId}`)
  assert.equal(requests[1].url.searchParams.get('user_id'), `eq.${userB}`)
})

test('saving a duplicate resource is idempotent and resolves a unique-index race', async (t) => {
  const resource = { id: 'real-resource-id', title: 'React guide', description: 'A real guide from search.', url: 'https://example.test/react/?utm_source=search', source: 'example.test', type: 'Article', level: 'Beginner', estimatedTime: null, language: null, freeAccess: 'unknown', reason: '' }
  const savedRow = { id: resourceId, resource: { ...resource, url: 'https://example.test/react' }, created_at: '2026-11-03T00:00:00Z' }
  let insertCount = 0
  const requests = mockRest(t, (url, method) => {
    if (method === 'GET' && url.pathname.endsWith('/saved_resources')) {
      if (url.searchParams.get('user_id') !== `eq.${userA}`) throw new Error('saved-resource lookup omitted owner filter')
      return Response.json(savedRow)
    }
    if (method === 'POST' && url.pathname.endsWith('/saved_resources')) { insertCount++; return Response.json([savedRow], { status: 201 }) }
    throw new Error(`Unexpected mocked PostgREST request: ${method} ${url.pathname}`)
  })
  const duplicate = await invoke('/save', 'post', { body: { resource } })
  assert.equal(duplicate.statusCode, 200)
  assert.equal(duplicate.body.saved.id, resourceId)
  assert.equal(duplicate.body.saved.resource.url, 'https://example.test/react')
  assert.equal(insertCount, 0)

  let lookupCount = 0
  const raceRequests = mockRest(t, (url, method) => {
    if (method === 'GET' && url.pathname.endsWith('/saved_resources')) {
      lookupCount++
      return lookupCount === 1 ? Response.json(null) : Response.json(savedRow)
    }
    if (method === 'POST' && url.pathname.endsWith('/saved_resources')) return Response.json({ code: '23505', message: 'duplicate key' }, { status: 409 })
    throw new Error(`Unexpected mocked PostgREST request: ${method} ${url.pathname}`)
  })
  const raced = await invoke('/save', 'post', { body: { resource } })
  assert.equal(raced.statusCode, 200)
  assert.equal(raced.body.saved.id, resourceId)
  assert.equal(raceRequests.length, 3)
})

test('roadmap reads and progress updates scope both lookup and write to the owner', async (t) => {
  let readCount = 0
  const requests = mockRest(t, async (url, method) => {
    if (url.pathname.endsWith('/learning_roadmaps') && method === 'GET') {
      readCount++
      if (readCount === 1) return Response.json([])
      return Response.json([{ topics: [{ id: topicId, completed: false }] }])
    }
    if (url.pathname.endsWith('/learning_roadmaps') && method === 'PATCH') return Response.json([{ id: roadmapId, topics: [{ id: topicId, completed: true }] }])
    throw new Error(`Unexpected mocked PostgREST request: ${method} ${url.pathname}`)
  })
  const missing = await invoke('/roadmaps/:id', 'get', { params: { id: roadmapId }, user: { id: userB } })
  assert.equal(missing.statusCode, 404)
  assert.equal(requests[0].url.searchParams.get('id'), `eq.${roadmapId}`)
  assert.equal(requests[0].url.searchParams.get('user_id'), `eq.${userB}`)

  const updated = await invoke('/topics/:id/progress', 'patch', { params: { id: topicId }, body: { roadmapId, completed: true } })
  assert.equal(updated.statusCode, 200)
  assert.equal(updated.body.roadmap.topics[0].completed, true)
  assert.equal(requests[1].url.searchParams.get('id'), `eq.${roadmapId}`)
  assert.equal(requests[1].url.searchParams.get('user_id'), `eq.${userA}`)
  assert.equal(requests[2].method, 'PATCH')
  assert.equal(requests[2].url.searchParams.get('id'), `eq.${roadmapId}`)
  assert.equal(requests[2].url.searchParams.get('user_id'), `eq.${userA}`)
})

test('invalid roadmap and topic IDs are rejected before database access', async (t) => {
  const requests = mockRest(t, async () => { throw new Error('database must not be called for invalid IDs') })
  const roadmap = await invoke('/roadmaps/:id', 'get', { params: { id: 'not-a-uuid' } })
  const progress = await invoke('/topics/:id/progress', 'patch', { params: { id: 'bad-topic' }, body: { roadmapId, completed: true } })
  assert.equal(roadmap.statusCode, 400)
  assert.equal(progress.statusCode, 400)
  assert.equal(requests.length, 0)
})
