import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../middleware/auth'

type Bindings = { DB: D1Database; JWT_SECRET: string }
const app = new Hono<{ Bindings: Bindings }>()

app.use('*', authMiddleware)

async function generateIssueCode(db: D1Database, monthYear: string): Promise<string> {
  const prefix = monthYear.replace('-', '')
  const count = await db
    .prepare('SELECT COUNT(*) as cnt FROM safety_issues WHERE month_year = ?')
    .bind(monthYear).first<{ cnt: number }>()
  const seq = ((count?.cnt || 0) + 1).toString().padStart(4, '0')
  return `${prefix}-${seq}`
}

// GET /api/safety-issues - List issues
app.get('/', async (c) => {
  const month = c.req.query('month')
  const committeeId = c.req.query('committee_day_id')
  const status = c.req.query('status')
  const user = c.get('user')
  
  let query = `SELECT si.*, 
    u1.full_name as submitter_name, 
    u2.full_name as resolver_name,
    cd.title as committee_title,
    cd.inspection_date
    FROM safety_issues si
    LEFT JOIN users u1 ON si.submitted_by = u1.id
    LEFT JOIN users u2 ON si.resolved_by = u2.id
    LEFT JOIN committee_days cd ON si.committee_day_id = cd.id`
  const conditions: string[] = []
  const values: any[] = []
  
  if (month) { conditions.push('si.month_year = ?'); values.push(month) }
  if (committeeId) { conditions.push('si.committee_day_id = ?'); values.push(committeeId) }
  if (status) { conditions.push('si.status = ?'); values.push(status) }
  // P0 users see only their own
  if (user.permission === 0) { conditions.push('si.submitted_by = ?'); values.push(user.userId) }
  
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ')
  query += ' ORDER BY si.created_at DESC'
  
  const result = await c.env.DB.prepare(query).bind(...values).all()
  return c.json(result.results)
})

// GET /api/safety-issues/:id
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const result = await c.env.DB
    .prepare(`SELECT si.*, 
      u1.full_name as submitter_name, u2.full_name as resolver_name,
      cd.title as committee_title, cd.inspection_date
      FROM safety_issues si
      LEFT JOIN users u1 ON si.submitted_by = u1.id
      LEFT JOIN users u2 ON si.resolved_by = u2.id
      LEFT JOIN committee_days cd ON si.committee_day_id = cd.id
      WHERE si.id = ?`)
    .bind(id).first()
  if (!result) return c.json({ error: 'Not found' }, 404)
  return c.json(result)
})

// POST /api/safety-issues - Submit issue
app.post('/', async (c) => {
  const user = c.get('user')
  const { committee_day_id, issue_type, location, description, remarks, image_before } = await c.req.json()
  
  if (!committee_day_id || !issue_type || !description) {
    return c.json({ error: 'committee_day_id, issue_type, and description required' }, 400)
  }
  if (!['person', 'condition'].includes(issue_type)) {
    return c.json({ error: 'issue_type must be person or condition' }, 400)
  }
  
  // Check committee day is open
  const day = await c.env.DB
    .prepare('SELECT * FROM committee_days WHERE id = ? AND status = \'open\'')
    .bind(committee_day_id).first()
  if (!day) return c.json({ error: 'Committee day not found or not open' }, 400)
  
  const dayData = day as any
  const month_year = dayData.month_year
  const issue_code = await generateIssueCode(c.env.DB, month_year)
  
  const result = await c.env.DB
    .prepare('INSERT INTO safety_issues (issue_code, committee_day_id, submitted_by, issue_type, location, description, remarks, image_before, month_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(issue_code, committee_day_id, user.userId, issue_type, location || null, description, remarks || null, image_before || null, month_year)
    .run()
  
  return c.json({ message: 'Issue submitted', id: result.meta.last_row_id, issue_code }, 201)
})

// PATCH /api/safety-issues/:id/resolve - Update resolution + image_after (P1+)
app.patch('/:id/resolve', requirePermission(1), async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user')
  const { image_after, resolve_remarks, status } = await c.req.json()
  const newStatus = status || 'resolved'
  
  const updates: string[] = ['status = ?', 'updated_at = datetime(\'now\')']
  const values: any[] = [newStatus]
  
  if (image_after) { updates.push('image_after = ?'); values.push(image_after) }
  if (resolve_remarks) { updates.push('resolve_remarks = ?'); values.push(resolve_remarks) }
  if (newStatus === 'resolved') {
    updates.push('resolved_by = ?', 'resolved_at = datetime(\'now\')')
    values.push(user.userId)
  }
  values.push(id)
  
  await c.env.DB
    .prepare(`UPDATE safety_issues SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values).run()
  
  return c.json({ message: 'Issue updated' })
})

// PATCH /api/safety-issues/:id - Update own issue (only submitter or P1+)
app.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user')
  const issue = await c.env.DB.prepare('SELECT * FROM safety_issues WHERE id = ?').bind(id).first<any>()
  if (!issue) return c.json({ error: 'Not found' }, 404)
  if (user.permission < 1 && issue.submitted_by !== user.userId) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const { description, remarks, issue_type, location, image_before } = await c.req.json()
  const updates: string[] = ['updated_at = datetime(\'now\')']
  const values: any[] = []
  if (description) { updates.push('description = ?'); values.push(description) }
  if (remarks !== undefined) { updates.push('remarks = ?'); values.push(remarks) }
  if (issue_type) { updates.push('issue_type = ?'); values.push(issue_type) }
  if (location !== undefined) { updates.push('location = ?'); values.push(location) }
  if (image_before) { updates.push('image_before = ?'); values.push(image_before) }
  values.push(id)
  await c.env.DB.prepare(`UPDATE safety_issues SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
  return c.json({ message: 'Issue updated' })
})

export default app
