import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../middleware/auth'

type Bindings = { DB: D1Database; JWT_SECRET: string }
const app = new Hono<{ Bindings: Bindings }>()

app.use('*', authMiddleware)
app.use('*', requirePermission(1))

// GET /api/export/data?period=YYYY-MM or YYYY&include=excel,before,after
app.get('/data', async (c) => {
  const period = c.req.query('period') // YYYY-MM or YYYY
  const include = c.req.query('include') || 'excel' // comma-separated: excel,before,after
  
  if (!period) return c.json({ error: 'period required (YYYY-MM or YYYY)' }, 400)
  
  let monthCondition = ''
  let bindVal = ''
  if (period.length === 7) {
    monthCondition = 'si.month_year = ?'
    bindVal = period
  } else if (period.length === 4) {
    monthCondition = 'si.month_year LIKE ?'
    bindVal = `${period}-%`
  } else {
    return c.json({ error: 'Invalid period format' }, 400)
  }
  
  const result = await c.env.DB
    .prepare(`SELECT si.issue_code, si.issue_type, si.location, si.description, si.remarks, 
      si.status, si.resolve_remarks, si.created_at, si.resolved_at, si.month_year,
      si.image_before, si.image_after,
      u1.full_name as submitter_name, u1.department as submitter_dept,
      u2.full_name as resolver_name,
      cd.title as committee_title, cd.inspection_date
      FROM safety_issues si
      LEFT JOIN users u1 ON si.submitted_by = u1.id
      LEFT JOIN users u2 ON si.resolved_by = u2.id
      LEFT JOIN committee_days cd ON si.committee_day_id = cd.id
      WHERE ${monthCondition}
      ORDER BY si.issue_code ASC`)
    .bind(bindVal).all()
  
  const includeList = include.split(',')
  const includeExcel = includeList.includes('excel')
  const includeBefore = includeList.includes('before')
  const includeAfter = includeList.includes('after')
  
  const issues = result.results as any[]
  const exportData = issues.map(issue => {
    const row: any = {}
    if (includeExcel) {
      row.issue_code = issue.issue_code
      row.committee_title = issue.committee_title
      row.inspection_date = issue.inspection_date
      row.issue_type = issue.issue_type === 'person' ? 'อันตรายจากบุคคล' : 'อันตรายจากสภาพงาน'
      row.location = issue.location
      row.description = issue.description
      row.remarks = issue.remarks
      row.submitter_name = issue.submitter_name
      row.submitter_dept = issue.submitter_dept
      row.status = issue.status === 'resolved' ? 'แก้ไขแล้ว' : issue.status === 'in_progress' ? 'กำลังแก้ไข' : 'รอดำเนินการ'
      row.resolve_remarks = issue.resolve_remarks
      row.resolver_name = issue.resolver_name
      row.created_at = issue.created_at
      row.resolved_at = issue.resolved_at
    }
    if (includeBefore) row.image_before = issue.image_before
    if (includeAfter) row.image_after = issue.image_after
    return row
  })
  
  return c.json({ period, total: issues.length, data: exportData })
})

export default app
