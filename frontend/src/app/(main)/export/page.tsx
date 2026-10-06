'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Download, FileSpreadsheet, Image as ImageIcon, Package, Loader2, CheckSquare, Square } from 'lucide-react'
import { getMonthYear } from '@/lib/utils'

export default function ExportPage() {
  const { toast } = useToast()
  const [period, setPeriod] = useState(getMonthYear())
  const [periodType, setPeriodType] = useState<'month' | 'year'>('month')
  const [yearVal, setYearVal] = useState(String(new Date().getFullYear()))
  const [includeExcel, setIncludeExcel] = useState(true)
  const [includeBefore, setIncludeBefore] = useState(false)
  const [includeAfter, setIncludeAfter] = useState(false)
  const [loading, setLoading] = useState(false)

  // Month options
  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(d)
    return { val, label }
  })

  // Year options
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - i
    return { val: String(y), label: String(y + 543) + ' (พ.ศ.)' }
  })

  async function handleExport() {
    if (!includeExcel && !includeBefore && !includeAfter) {
      toast({ variant: 'destructive', title: 'กรุณาเลือกอย่างน้อย 1 รายการที่ต้องการ export' })
      return
    }
    setLoading(true)
    try {
      const targetPeriod = periodType === 'month' ? period : yearVal
      const include = [includeExcel && 'excel', includeBefore && 'before', includeAfter && 'after']
        .filter(Boolean).join(',')
      const result = await api.getExportData(targetPeriod, include)

      if (result.total === 0) {
        toast({ title: 'ไม่พบข้อมูล', description: 'ไม่มีรายการในช่วงเวลาที่เลือก' })
        setLoading(false)
        return
      }

      // Export Excel
      if (includeExcel) {
        const XLSX = await import('xlsx')
        const excelData = result.data.map((row: any) => ({
          'รหัสเรื่อง': row.issue_code,
          'วันตรวจ': row.inspection_date,
          'ชื่อการตรวจ': row.committee_title,
          'ประเภทอันตราย': row.issue_type,
          'สถานที่': row.location || '',
          'รายละเอียด': row.description,
          'หมายเหตุ': row.remarks || '',
          'ผู้ส่ง': row.submitter_name,
          'แผนก': row.submitter_dept || '',
          'สถานะ': row.status,
          'หมายเหตุการแก้ไข': row.resolve_remarks || '',
          'ผู้แก้ไข': row.resolver_name || '',
          'วันที่ส่ง': row.created_at,
          'วันที่แก้ไข': row.resolved_at || '',
        }))
        const ws = XLSX.utils.json_to_sheet(excelData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Safety Issues')
        XLSX.writeFile(wb, `safety-committee-${targetPeriod}.xlsx`)
      }

      // Export images as zip
      if (includeBefore || includeAfter) {
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()
        const folder = zip.folder(`safety-images-${targetPeriod}`)!

        for (const row of result.data as any[]) {
          if (includeBefore && row.image_before) {
            const b64 = row.image_before.split(',')[1] || row.image_before
            folder.file(`${row.issue_code}-before.jpg`, b64, { base64: true })
          }
          if (includeAfter && row.image_after) {
            const b64 = row.image_after.split(',')[1] || row.image_after
            folder.file(`${row.issue_code}-after.jpg`, b64, { base64: true })
          }
        }

        const blob = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `safety-images-${targetPeriod}.zip`
        a.click()
        URL.revokeObjectURL(url)
      }

      toast({ title: 'Export สำเร็จ', description: `ส่งออก ${result.total} รายการ` })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Export ไม่สำเร็จ', description: e.message })
    } finally {
      setLoading(false)
    }
  }

  function CheckItem({ checked, onChange, icon, label, desc }: { checked: boolean; onChange: (v: boolean) => void; icon: React.ReactNode; label: string; desc: string }) {
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all w-full ${
          checked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
        }`}
      >
        {checked ? <CheckSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <Square className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />}
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className="font-medium text-sm">{label}</div>
            <div className="text-xs text-muted-foreground">{desc}</div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">ส่งออกข้อมูล</h1>
        <p className="text-muted-foreground mt-1">Export Safety Committee Data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ช่วงเวลา</CardTitle>
          <CardDescription>เลือกช่วงเวลาที่ต้องการส่งออกข้อมูล</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Period type */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPeriodType('month')}
              className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                periodType === 'month' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'
              }`}
            >
              รายเดือน
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('year')}
              className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                periodType === 'year' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'
              }`}
            >
              รายปี
            </button>
          </div>

          {periodType === 'month' ? (
            <div className="space-y-2">
              <Label>เลือกเดือน</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => <SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>เลือกปี</Label>
              <Select value={yearVal} onValueChange={setYearVal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => <SelectItem key={y.val} value={y.val}>{y.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลที่ต้องการ</CardTitle>
          <CardDescription>เลือกรูปแบบข้อมูลที่ต้องการส่งออก</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CheckItem
            checked={includeExcel}
            onChange={setIncludeExcel}
            icon={<FileSpreadsheet className="w-5 h-5 text-green-600" />}
            label="Excel (.xlsx)"
            desc="ตารางข้อมูลทั้งหมด ไม่รวมรูปภาพ"
          />
          <CheckItem
            checked={includeBefore}
            onChange={setIncludeBefore}
            icon={<ImageIcon className="w-5 h-5 text-blue-600" />}
            label="รูปภาพก่อนแก้ไข"
            desc="รูปที่อัพโหลดตอนส่งเรื่อง (ZIP)"
          />
          <CheckItem
            checked={includeAfter}
            onChange={setIncludeAfter}
            icon={<ImageIcon className="w-5 h-5 text-orange-600" />}
            label="รูปภาพหลังแก้ไข"
            desc="รูปที่อัพโหลดตอนแก้ไขเรื่อง (ZIP)"
          />
        </CardContent>
      </Card>

      <Button className="w-full h-12 text-base" onClick={handleExport} disabled={loading}>
        {loading
          ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลัง Export...</>
          : <><Download className="w-5 h-5" /> Export ข้อมูล</>}
      </Button>
    </div>
  )
}
