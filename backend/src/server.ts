import { app } from './app.js'
import { env } from './config/env.js'

const server = app.listen(env.PORT, () => console.info(`Bhūmikā API listening on port ${env.PORT} (${env.NODE_ENV})`))

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
