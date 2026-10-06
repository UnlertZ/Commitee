'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, CommitteeDay } from '@/lib/api'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, X, CalendarCheck, AlertCircle, Loader2, ImageIcon } from 'lucide-react'
import { formatThaiDate, issueTypeLabel } from '@/lib/utils'

const MAX_SIZE_MB = 2
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

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
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      const base64 = canvas.toDataURL('image/jpeg', 0.75)
      URL.revokeObjectURL(url)
      resolve(base64)
    }
    img.onerror = reject
    img.src = url
  })
}

export default function SubmitIssuePage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [activeDay, setActiveDay] = useState<CommitteeDay | null>(null)
  const [loadingDay, setLoadingDay] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [imageB64, setImageB64] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const [form, setForm] = useState({
    issue_type: 'condition' as 'person' | 'condition',
    location: '',
    description: '',
    remarks: '',
  })

  useEffect(() => {
    api.getActiveDay().then(day => { setActiveDay(day); setLoadingDay(false) }).catch(() => setLoadingDay(false))
  }, [])

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'กรุณาเลือกไฟล์รูปภาพ' })
      return
    }
    if (file.size > MAX_SIZE_BYTES * 3) {
      toast({ variant: 'destructive', title: 'ไฟล์ใหญ่เกิน 6MB', description: 'กรุณาเลือกรูปที่เล็กกว่านี้' })
      return
    }
    const b64 = await compressImage(file)
    setImageB64(b64)
    setPreview(b64)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeDay) { toast({ variant: 'destructive', title: 'ยังไม่มีการเปิด Committee Day' }); return }
    if (!form.description.trim()) { toast({ variant: 'destructive', title: 'กรุณากรอกรายละเอียด' }); return }
    setSubmitting(true)
    try {
      const res = await api.submitIssue({
        committee_day_id: activeDay.id,
        issue_type: form.issue_type,
        location: form.location || undefined,
        description: form.description,
        remarks: form.remarks || undefined,
        image_before: imageB64 || undefined,
      })
      toast({ title: 'ส่งเรื่องสำเร็จ', description: `รหัส: ${(res as any).issue_code}` })
      router.push('/issues')
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ส่งเรื่องไม่สำเร็จ', description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingDay) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">ส่งเรื่องเข้าระบบ</h1>
        <p className="text-muted-foreground mt-1">Submit Safety Issue</p>
      </div>

      {/* Active Day info */}
      {activeDay ? (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <CalendarCheck className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-400">{activeDay.title}</p>
            <p className="text-sm text-green-700 dark:text-green-500">วันที่ตรวจ: {formatThaiDate(activeDay.inspection_date)}</p>
            {activeDay.location && <p className="text-sm text-green-700 dark:text-green-500">สถานที่: {activeDay.location}</p>}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-400">ยังไม่มีการเปิด Committee Day</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-500">ไม่สามารถส่งเรื่องได้ในขณะนี้ กรุณารอ Admin เปิดรับเรื่อง</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>รายละเอียดเรื่องที่พบ</CardTitle>
            <CardDescription>กรอกข้อมูลเรื่องที่พบในการตรวจความปลอดภัย</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Issue Type */}
            <div className="space-y-2">
              <Label>ประเภทอันตราย *</Label>
              <div className="grid grid-cols-2 gap-3">
                {(['condition', 'person'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, issue_type: type }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.issue_type === type
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{issueTypeLabel(type)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {type === 'person' ? 'พฤติกรรมเสี่ยงของบุคคล' : 'สภาพแวดล้อมและอุปกรณ์'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">สถานที่พบ</Label>
              <Input
                id="location"
                placeholder="เช่น ห้องเครื่อง, โซน A, อาคาร 2"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">รายละเอียดที่พบ *</Label>
              <Textarea
                id="description"
                placeholder="อธิบายสิ่งที่พบ, สภาพอันตราย หรือพฤติกรรมเสี่ยง..."
                className="min-h-[100px]"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
              />
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks">หมายเหตุ</Label>
              <Textarea
                id="remarks"
                placeholder="ข้อเสนอแนะหรือหมายเหตุเพิ่มเติม..."
                className="min-h-[60px]"
                value={form.remarks}
                onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>รูปภาพก่อนแก้ไข</Label>
              <div
                className={`relative border-2 border-dashed rounded-xl transition-all ${
                  dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                {preview ? (
                  <div className="relative">
                    <img src={preview} alt="preview" className="w-full max-h-64 object-contain rounded-xl" />
                    <button
                      type="button"
                      className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80"
                      onClick={() => { setPreview(null); setImageB64(null) }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-8 text-center cursor-pointer" onClick={() => fileRef.current?.click()}>
                    <ImageIcon className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">ลากรูปมาวางที่นี่ หรือ</p>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => fileRef.current?.click()}>
                      <Upload className="w-3 h-3" /> เลือกรูป
                    </Button>
                    <p className="text-xs text-muted-foreground/60 mt-2">JPG, PNG ขนาดไม่เกิน 6MB (จะถูก compress อัตโนมัติ)</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>ยกเลิก</Button>
          <Button type="submit" className="flex-1" disabled={!activeDay || submitting}>
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังส่ง...</> : 'ส่งเรื่องเข้าระบบ'}
          </Button>
        </div>
      </form>
    </div>
  )
}
