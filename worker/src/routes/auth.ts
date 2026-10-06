import { Hono } from 'hono'
import { sign } from '../utils/jwt'
import { hashPassword, verifyPassword } from '../utils/password'

type Bindings = { DB: D1Database; JWT_SECRET: string }
const app = new Hono<{ Bindings: Bindings }>()

// POST /api/auth/login
app.post('/login', async (c) => {
  const { username, password } = await c.req.json()
  if (!username || !password) {
    return c.json({ error: 'Username and password required' }, 400)
  }
  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1')
    .bind(username, username)
    .first<any>()
  if (!user) return c.json({ error: 'Invalid credentials' }, 401)

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401)

  // If legacy hash, re-hash with new system
  if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
    const newHash = await hashPassword(password)
    await c.env.DB
      .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(newHash, user.id)
      .run()
  }

  const token = await sign(
    { userId: user.id, username: user.username, permission: user.permission },
    c.env.JWT_SECRET
  )
  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      department: user.department,
      permission: user.permission
    }
  })
})

// POST /api/auth/register
app.post('/register', async (c) => {
  const { username, email, password, full_name, department } = await c.req.json()
  if (!username || !email || !password || !full_name) {
    return c.json({ error: 'All required fields must be provided' }, 400)
  }
  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400)
  }
  const existing = await c.env.DB
    .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
    .bind(username, email)
    .first()
  if (existing) return c.json({ error: 'Username or email already exists' }, 409)

  const hash = await hashPassword(password)
  const result = await c.env.DB
    .prepare('INSERT INTO users (username, email, password_hash, full_name, department, permission) VALUES (?, ?, ?, ?, ?, 0)')
    .bind(username, email, hash, full_name, department || null)
    .run()

  return c.json({ message: 'Registration successful', userId: result.meta.last_row_id }, 201)
})

export default app
