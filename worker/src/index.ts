import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import authRoutes from './routes/auth'
import usersRoutes from './routes/users'
import committeeDaysRoutes from './routes/committee-days'
import safetyIssuesRoutes from './routes/safety-issues'
import exportRoutes from './routes/export'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  FRONTEND_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', logger())
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: [c.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
  return corsMiddleware(c, next)
})

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'jdecommitee-api', version: '1.0.0' }))

// Routes
app.route('/api/auth', authRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/committee-days', committeeDaysRoutes)
app.route('/api/safety-issues', safetyIssuesRoutes)
app.route('/api/export', exportRoutes)

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Error handler
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error', message: err.message }, 500)
})

export default app
