import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../middleware/auth'

type Bindings = { DB: D1Database; JWT_SECRET: string }
const app = new Hono<{ Bindings: Bindings }>()

app.use('*', authMiddleware)

// GET /api/committee-days - List all (with optional ?month=YYYY-MM filter)
app.get('/', async (c) => {
  const month = c.req.query('month')
  const status = c.req.query('status')
  let query = `SELECT cd.*, u.full_name as creator_name 
    FROM committee_days cd 
    LEFT JOIN users u ON cd.created_by = u.id`
  const conditions: string[] = []
  const values: any[] = []
  if (month) { conditions.push('cd.month_year = ?'); values.push(month) }
  if (status) { conditions.push('cd.status = ?'); values.push(status) }
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ')
  query += ' ORDER BY cd.inspection_date DESC'
  const result = await c.env.DB.prepare(query).bind(...values).all()
  return c.json(result.results)
})

// GET /api/committee-days/active - Get currently open day
app.get('/active', async (c) => {
  const result = await c.env.DB
    .prepare(`SELECT cd.*, u.full_name as creator_name 
      FROM committee_days cd 
      LEFT JOIN users u ON cd.created_by = u.id
      WHERE cd.status = 'open' 
      ORDER BY cd.inspection_date DESC LIMIT 1`)
    .first()
  return c.json(result || null)
})

// GET /api/committee-days/:id
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const result = await c.env.DB
    .prepare(`SELECT cd.*, u.full_name as creator_name 
      FROM committee_days cd 
      LEFT JOIN users u ON cd.created_by = u.id
      WHERE cd.id = ?`)
    .bind(id).first()
  if (!result) return c.json({ error: 'Not found' }, 404)
  return c.json(result)
})

// POST /api/committee-days - Create new (P1+)
app.post('/', requirePermission(1), async (c) => {
  const user = c.get('user')
  const { title, inspection_date, location, description } = await c.req.json()
  if (!title || !inspection_date) {
    return c.json({ error: 'Title and inspection_date required' }, 400)
  }
  const month_year = inspection_date.substring(0, 7) // YYYY-MM
  const result = await c.env.DB
    .prepare('INSERT INTO committee_days (title, inspection_date, month_year, location, description, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(title, inspection_date, month_year, location || null, description || null, user.userId)
    .run()
  return c.json({ message: 'Committee day created', id: result.meta.last_row_id }, 201)
})

// PATCH /api/committee-days/:id/close - Close committee day (P1+)
app.patch('/:id/close', requirePermission(1), async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB
    .prepare("UPDATE committee_days SET status = 'closed', closed_at = datetime('now') WHERE id = ?")
    .bind(id).run()
  return c.json({ message: 'Committee day closed' })
})

// PATCH /api/committee-days/:id/reopen - Reopen (P1+)
app.patch('/:id/reopen', requirePermission(1), async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB
    .prepare("UPDATE committee_days SET status = 'open', closed_at = NULL WHERE id = ?")
    .bind(id).run()
  return c.json({ message: 'Committee day reopened' })
})

// DELETE /api/committee-days/:id (P2 only)
app.delete('/:id', requirePermission(2), async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM committee_days WHERE id = ?').bind(id).run()
  return c.json({ message: 'Committee day deleted' })
})

export default app
