'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, CommitteeDay } from '@/lib/api'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, CalendarCheck, MapPin, Power, PowerOff, Trash2, Loader2, RefreshCw, Lock } from 'lucide-react'
import { formatThaiDate, formatThaiDateTime } from '@/lib/utils'

export default function CommitteeDaysPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [days, setDays] = useState<CommitteeDay[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ title: '', inspection_date: '', location: '', description: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getCommitteeDays()
      setDays(data)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'โหลดข้อมูลไม่สำเร็จ', description: e.message })
    } finally { setLoading(false) }
  }, [toast])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createCommitteeDay(form)
      toast({ title: 'เปิด Committee Day สำเร็จ' })
      setCreateOpen(false)
      setForm({ title: '', inspection_date: '', location: '', description: '' })
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ไม่สำเร็จ', description: e.message })
    } finally { setSaving(false) }
  }

  async function toggleStatus(day: CommitteeDay) {
    try {
      if (day.status === 'open') {
        await api.closeCommitteeDay(day.id)
        toast({ title: 'ปิด Committee Day แล้ว' })
      } else {
        await api.reopenCommitteeDay(day.id)
        toast({ title: 'เปิด Committee Day อีกครั้ง' })
      }
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ไม่สำเร็จ', description: e.message })
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('ยืนยันการลบ Committee Day นี้? รายการที่ส่งมาทั้งหมดจะถูกลบด้วย')) return
    try {
      await api.deleteCommitteeDay(id)
      toast({ title: 'ลบสำเร็จ' })
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ลบไม่สำเร็จ', description: e.message })
    }
  }

  // Set default date to today
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">วันตรวจความปลอดภัย</h1>
          <p className="text-muted-foreground mt-1">Safety Committee Days</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          {user && user.permission >= 1 && (
            <Button onClick={() => { setForm(f => ({ ...f, inspection_date: today })); setCreateOpen(true) }}>
              <Plus className="w-4 h-4" /> เปิด Committee Day
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : days.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CalendarCheck className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">ยังไม่มีวันตรวจ</p>
          {user && user.permission >= 1 && <Button className="mt-4" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> เปิดวันแรก</Button>}
        </div>
      ) : (
        <div className="space-y-4">
          {days.map(day => (
            <Card key={day.id} className={`transition-all ${day.status === 'open' ? 'border-orange-200 dark:border-orange-800 shadow-orange-100 dark:shadow-orange-950' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    day.status === 'open'
                      ? 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-200'
                      : 'bg-muted'
                  }`}>
                    <CalendarCheck className={`w-6 h-6 ${day.status === 'open' ? 'text-white' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-lg">{day.title}</h3>
                      <Badge variant={day.status === 'open' ? 'default' : 'secondary'}>
                        {day.status === 'open' ? 'เปิดรับเรื่อง' : 'ปิดแล้ว'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><CalendarCheck className="w-3.5 h-3.5" /> {formatThaiDate(day.inspection_date)}</span>
                      {day.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {day.location}</span>}
                      <span>เปิดโดย: {day.creator_name}</span>
                      <span>สร้าง: {formatThaiDateTime(day.created_at)}</span>
                      {day.closed_at && <span>ปิด: {formatThaiDateTime(day.closed_at)}</span>}
                    </div>
                    {day.description && <p className="text-sm text-muted-foreground mt-2 bg-muted/50 rounded-lg px-3 py-2">{day.description}</p>}
                  </div>
                  {user && user.permission >= 1 && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className={day.status === 'open' ? 'text-orange-600 border-orange-200 hover:bg-orange-50' : 'text-green-600 border-green-200 hover:bg-green-50'}
                        onClick={() => toggleStatus(day)}
                      >
                        {day.status === 'open' ? <><PowerOff className="w-4 h-4" /> ปิด</> : <><Power className="w-4 h-4" /> เปิด</>}
                      </Button>
                      {user.permission >= 2 && (
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/5" onClick={() => handleDelete(day.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เปิด Safety Committee Day</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">ชื่อวันตรวจ *</Label>
              <Input
                id="title"
                placeholder="เช่น การตรวจความปลอดภัยประจำเดือน ต.ค. 2569"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspection_date">วันที่เดินตรวจ *</Label>
              <Input
                id="inspection_date"
                type="date"
                value={form.inspection_date}
                onChange={e => setForm(f => ({ ...f, inspection_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">สถานที่</Label>
              <Input
                id="location"
                placeholder="โรงงาน, อาคาร, โซน..."
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">รายละเอียด</Label>
              <Textarea
                id="description"
                placeholder="รายละเอียดเพิ่มเติม..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังสร้าง...</> : 'เปิด Committee Day'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
