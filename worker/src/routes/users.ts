import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../middleware/auth'
import { hashPassword } from '../utils/password'

type Bindings = { DB: D1Database; JWT_SECRET: string }
const app = new Hono<{ Bindings: Bindings }>()

app.use('*', authMiddleware)

// GET /api/users - List all users (P2 only)
app.get('/', requirePermission(2), async (c) => {
  const users = await c.env.DB
    .prepare('SELECT id, username, email, full_name, department, permission, is_active, created_at FROM users ORDER BY permission DESC, full_name ASC')
    .all()
  return c.json(users.results)
})

// GET /api/users/me - Get current user profile
app.get('/me', async (c) => {
  const user = c.get('user')
  const dbUser = await c.env.DB
    .prepare('SELECT id, username, email, full_name, department, permission, is_active, created_at FROM users WHERE id = ?')
    .bind(user.userId)
    .first()
  if (!dbUser) return c.json({ error: 'User not found' }, 404)
  return c.json(dbUser)
})

// POST /api/users - Create user (P2 only)
app.post('/', requirePermission(2), async (c) => {
  const { username, email, password, full_name, department, permission } = await c.req.json()
  if (!username || !email || !password || !full_name) {
    return c.json({ error: 'Required fields missing' }, 400)
  }
  const perm = Math.min(Math.max(Number(permission) || 0, 0), 2)
  const hash = await hashPassword(password)
  const result = await c.env.DB
    .prepare('INSERT INTO users (username, email, password_hash, full_name, department, permission) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(username, email, hash, full_name, department || null, perm)
    .run()
  return c.json({ message: 'User created', userId: result.meta.last_row_id }, 201)
})

// PATCH /api/users/:id - Update user (P2 only)
app.patch('/:id', requirePermission(2), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const updates: string[] = []
  const values: any[] = []
  if (body.full_name !== undefined) { updates.push('full_name = ?'); values.push(body.full_name) }
  if (body.department !== undefined) { updates.push('department = ?'); values.push(body.department) }
  if (body.permission !== undefined) { updates.push('permission = ?'); values.push(Math.min(Math.max(Number(body.permission), 0), 2)) }
  if (body.is_active !== undefined) { updates.push('is_active = ?'); values.push(body.is_active ? 1 : 0) }
  if (body.password) {
    const hash = await hashPassword(body.password)
    updates.push('password_hash = ?')
    values.push(hash)
  }
  if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400)
  updates.push('updated_at = datetime(\'now\')')
  values.push(id)
  await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
  return c.json({ message: 'User updated' })
})

// DELETE /api/users/:id - Deactivate user (P2 only)
app.delete('/:id', requirePermission(2), async (c) => {
  const id = Number(c.req.param('id'))
  const currentUser = c.get('user')
  if (id === currentUser.userId) return c.json({ error: 'Cannot deactivate yourself' }, 400)
  await c.env.DB.prepare('UPDATE users SET is_active = 0 WHERE id = ?').bind(id).run()
  return c.json({ message: 'User deactivated' })
})

export default app
