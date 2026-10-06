'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, SafetyIssue, CommitteeDay } from '@/lib/api'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle, CheckCircle2, Clock, CalendarCheck,
  Users, TrendingUp, ArrowRight, MapPin, FileText
} from 'lucide-react'
import { formatThaiDate, formatThaiDateTime, statusLabel, statusColor, issueTypeLabel, getMonthYear } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardPage() {
  const { user } = useAuth()
  const [activeDay, setActiveDay] = useState<CommitteeDay | null>(null)
  const [issues, setIssues] = useState<SafetyIssue[]>([])
  const [loading, setLoading] = useState(true)
  const currentMonth = getMonthYear()

  const load = useCallback(async () => {
    try {
      const [dayRes, issuesRes] = await Promise.all([
        api.getActiveDay(),
        api.getSafetyIssues({ month: currentMonth })
      ])
      setActiveDay(dayRes)
      setIssues(issuesRes)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => { load() }, [load])

  const pending = issues.filter(i => i.status === 'pending').length
  const inProgress = issues.filter(i => i.status === 'in_progress').length
  const resolved = issues.filter(i => i.status === 'resolved').length
  const personIssues = issues.filter(i => i.issue_type === 'person').length
  const conditionIssues = issues.filter(i => i.issue_type === 'condition').length

  // Group by active committee day
  const todayIssues = activeDay
    ? issues.filter(i => i.committee_day_id === activeDay.id)
    : issues.slice(0, 10)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          กำลังโหลด...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">แดชบอร์ด</h1>
          <p className="text-muted-foreground mt-1">ยินดีต้อนรับ, {user?.full_name}</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>เดือน: {new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(new Date())}</p>
        </div>
      </div>

      {/* Active Committee Day Banner */}
      {activeDay ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white shadow-xl">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-20" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white/90 text-sm font-medium">กำลังเปิดรับเรื่อง</span>
            </div>
            <h2 className="text-2xl font-bold mb-1">{activeDay.title}</h2>
            <div className="flex flex-wrap gap-4 text-white/80 text-sm mt-3">
              <span className="flex items-center gap-1.5"><CalendarCheck className="w-4 h-4" /> {formatThaiDate(activeDay.inspection_date)}</span>
              {activeDay.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {activeDay.location}</span>}
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {todayIssues.length} รายการวันนี้</span>
            </div>
            <Link href="/submit-issue" className="mt-4 inline-block">
              <Button variant="outline" className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:text-white">
                ส่งเรื่องเข้าระบบ <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-6 text-center">
          <CalendarCheck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">ยังไม่มีการเปิด Safety Committee Day</p>
          <p className="text-muted-foreground/70 text-sm mt-1">Admin จะเปิดรับเรื่องเมื่อถึงวันตรวจ</p>
          {user && user.permission >= 1 && (
            <Link href="/committee-days" className="mt-3 inline-block">
              <Button size="sm" className="mt-1">เปิด Committee Day</Button>
            </Link>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Clock className="w-5 h-5 text-yellow-600" />} label="รอดำเนินการ" value={pending} color="bg-yellow-50 dark:bg-yellow-950/30" />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-blue-600" />} label="กำลังแก้ไข" value={inProgress} color="bg-blue-50 dark:bg-blue-950/30" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} label="แก้ไขแล้ว" value={resolved} color="bg-green-50 dark:bg-green-950/30" />
        <StatCard icon={<AlertTriangle className="w-5 h-5 text-orange-600" />} label="ทั้งหมดเดือนนี้" value={issues.length} color="bg-orange-50 dark:bg-orange-950/30" />
      </div>

      {/* Issue type breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">อันตรายจากบุคคล</p>
                <p className="text-2xl font-bold mt-1">{personIssues}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">อันตรายจากสภาพงาน</p>
                <p className="text-2xl font-bold mt-1">{conditionIssues}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Issues Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">
            {activeDay ? `รายการวันนี้ — ${activeDay.title}` : 'รายการล่าสุดเดือนนี้'}
          </CardTitle>
          <Link href="/issues">
            <Button variant="ghost" size="sm" className="gap-1">ดูทั้งหมด <ArrowRight className="w-3 h-3" /></Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {todayIssues.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>ยังไม่มีรายการ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">รหัส</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">ประเภท</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">รายละเอียด</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">สถานที่</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">สถานะ</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">เวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {todayIssues.map(issue => (
                    <tr key={issue.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{issue.issue_code}</td>
                      <td className="px-4 py-3">
                        <Badge variant={issue.issue_type === 'person' ? 'destructive' : 'purple'}>
                          {issueTypeLabel(issue.issue_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate">{issue.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{issue.location || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(issue.status)}`}>
                          {statusLabel(issue.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatThaiDateTime(issue.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className={`p-5 ${color} rounded-xl`}>
        <div className="flex items-center justify-between mb-3">
          {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  )
}
