import type { ErrorRequestHandler, RequestHandler } from 'express'

export const notFound: RequestHandler = (_req, res) => { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'The requested endpoint was not found.' } }) }

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const status = Number(error?.statusCode) || 500
  if (status >= 500) console.error('Request failed:', error instanceof Error ? error.message : 'Unknown error')
  const message = status >= 500 && process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : (error instanceof Error ? error.message : 'An unexpected server error occurred.')
  res.status(status).json({ error: { code: status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR', message } })
}
