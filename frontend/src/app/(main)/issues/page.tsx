'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, SafetyIssue } from '@/lib/api'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Search, Filter, Eye, CheckCircle2, Upload, X, Image as ImageIcon, Loader2
} from 'lucide-react'
import {
  formatThaiDate, formatThaiDateTime, statusLabel, statusColor,
  issueTypeLabel, getMonthYear, permissionLabel
} from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      const maxDim = 1200
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.onerror = reject
    img.src = url
  })
}

export default function IssuesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [issues, setIssues] = useState<SafetyIssue[]>([])
  const [filtered, setFiltered] = useState<SafetyIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState(getMonthYear())
  const [selected, setSelected] = useState<SafetyIssue | null>(null)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolveData, setResolveData] = useState({ status: 'resolved', resolve_remarks: '', image_after: '' as string })
  const [imageAfterPreview, setImageAfterPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getSafetyIssues({ month: monthFilter || undefined })
      setIssues(data)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'โหลดข้อมูลไม่สำเร็จ', description: e.message })
    } finally { setLoading(false) }
  }, [monthFilter, toast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let res = issues
    if (search) res = res.filter(i => i.description.toLowerCase().includes(search.toLowerCase()) || i.issue_code.includes(search) || (i.location || '').toLowerCase().includes(search.toLowerCase()))
    if (statusFilter !== 'all') res = res.filter(i => i.status === statusFilter)
    setFiltered(res)
  }, [issues, search, statusFilter])

  async function handleResolve() {
    if (!selected) return
    setSaving(true)
    try {
      await api.resolveIssue(selected.id, {
        status: resolveData.status,
        resolve_remarks: resolveData.resolve_remarks || undefined,
        image_after: resolveData.image_after || undefined,
      })
      toast({ title: 'อัพเดทสำเร็จ' })
      setResolveOpen(false)
      setSelected(null)
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'อัพเดทไม่สำเร็จ', description: e.message })
    } finally { setSaving(false) }
  }

  async function handleImageAfter(file: File) {
    const b64 = await compressImage(file)
    setResolveData(d => ({ ...d, image_after: b64 }))
    setImageAfterPreview(b64)
  }

  // Generate month options (last 24 months)
  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(d)
    return { val, label }
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">รายการทั้งหมด</h1>
        <p className="text-muted-foreground mt-1">Safety Issues — All Records</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา รหัส, รายละเอียด, สถานที่..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="เดือน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ทุกเดือน</SelectItem>
                {monthOptions.map(m => <SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="pending">รอดำเนินการ</SelectItem>
                <SelectItem value="in_progress">กำลังแก้ไข</SelectItem>
                <SelectItem value="resolved">แก้ไขแล้ว</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Issues list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>รายการ ({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">ไม่พบรายการ</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(issue => (
                <div key={issue.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Image thumbnail */}
                    <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                      {issue.image_before
                        ? <img src={issue.image_before} alt="before" className="w-full h-full object-cover" />
                        : <ImageIcon className="w-6 h-6 text-muted-foreground/40" />}
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{issue.issue_code}</span>
                        <Badge variant={issue.issue_type === 'person' ? 'destructive' : 'purple'}>
                          {issueTypeLabel(issue.issue_type)}
                        </Badge>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(issue.status)}`}>
                          {statusLabel(issue.status)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground line-clamp-2">{issue.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        {issue.location && <span>📍 {issue.location}</span>}
                        <span>👤 {issue.submitter_name}</span>
                        <span>🕐 {formatThaiDateTime(issue.created_at)}</span>
                        <span>📋 {issue.committee_title}</span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => setSelected(issue)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {user && user.permission >= 1 && (
                        <Button
                          variant="outline" size="sm"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => {
                            setSelected(issue)
                            setResolveData({ status: issue.status === 'resolved' ? 'resolved' : 'resolved', resolve_remarks: issue.resolve_remarks || '', image_after: issue.image_after || '' })
                            setImageAfterPreview(issue.image_after || null)
                            setResolveOpen(true)
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Resolve info */}
                  {issue.status === 'resolved' && issue.image_after && (
                    <div className="mt-3 ml-20 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-green-200">
                        <img src={issue.image_after} alt="after" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="text-green-600 font-medium">✓ แก้ไขแล้ว</span>
                        {issue.resolve_remarks && <p className="mt-0.5">{issue.resolve_remarks}</p>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Detail Dialog */}
      <Dialog open={!!selected && !resolveOpen} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              รายละเอียด — <span className="font-mono text-sm text-muted-foreground">{selected?.issue_code}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">ประเภท:</span> <Badge variant={selected.issue_type === 'person' ? 'destructive' : 'purple'} className="ml-1">{issueTypeLabel(selected.issue_type)}</Badge></div>
                <div><span className="text-muted-foreground">สถานะ:</span> <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(selected.status)}`}>{statusLabel(selected.status)}</span></div>
                <div><span className="text-muted-foreground">วันที่ตรวจ:</span> <span className="ml-1">{formatThaiDate(selected.inspection_date)}</span></div>
                <div><span className="text-muted-foreground">สถานที่:</span> <span className="ml-1">{selected.location || '-'}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">ผู้ส่ง:</span> <span className="ml-1">{selected.submitter_name} {selected.submitter_dept ? `(${selected.submitter_dept})` : ''}</span></div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">รายละเอียด</p>
                <p className="text-sm bg-muted/50 rounded-lg p-3">{selected.description}</p>
              </div>
              {selected.remarks && <div>
                <p className="text-sm text-muted-foreground mb-1">หมายเหตุ</p>
                <p className="text-sm bg-muted/50 rounded-lg p-3">{selected.remarks}</p>
              </div>}
              {selected.image_before && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">รูปก่อนแก้ไข</p>
                  <img src={selected.image_before} alt="before" className="w-full rounded-xl border" />
                </div>
              )}
              {selected.image_after && (
                <div>
                  <p className="text-sm text-green-600 font-medium mb-2">รูปหลังแก้ไข</p>
                  <img src={selected.image_after} alt="after" className="w-full rounded-xl border border-green-200" />
                  {selected.resolve_remarks && <p className="text-sm text-muted-foreground mt-2">{selected.resolve_remarks}</p>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveOpen} onOpenChange={o => { if (!o) { setResolveOpen(false) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>อัพเดทสถานะการแก้ไข</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>สถานะ</Label>
              <Select value={resolveData.status} onValueChange={v => setResolveData(d => ({ ...d, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">กำลังแก้ไข</SelectItem>
                  <SelectItem value="resolved">แก้ไขแล้ว</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>หมายเหตุการแก้ไข</Label>
              <Textarea
                placeholder="รายละเอียดการแก้ไข..."
                value={resolveData.resolve_remarks}
                onChange={e => setResolveData(d => ({ ...d, resolve_remarks: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>รูปหลังแก้ไข</Label>
              {imageAfterPreview ? (
                <div className="relative">
                  <img src={imageAfterPreview} alt="after" className="w-full max-h-48 object-contain rounded-xl border" />
                  <button
                    type="button"
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center"
                    onClick={() => { setImageAfterPreview(null); setResolveData(d => ({ ...d, image_after: '' })) }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">เลือกรูปหลังแก้ไข</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageAfter(f) }} />
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleResolve} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</> : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
