'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', full_name: '', department: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast({ variant: 'destructive', title: 'รหัสผ่านไม่ตรงกัน' })
      return
    }
    setLoading(true)
    try {
      await api.register({ username: form.username, email: form.email, password: form.password, full_name: form.full_name, department: form.department || undefined })
      toast({ title: 'สมัครสมาชิกสำเร็จ', description: 'กรุณาเข้าสู่ระบบ', variant: 'default' })
      router.push('/login')
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'สมัครสมาชิกไม่สำเร็จ', description: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-safety-50 via-orange-50 to-amber-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-xl mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Safety Committee</h1>
          <p className="text-muted-foreground mt-1">สมัครสมาชิก</p>
        </div>
        <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">สร้างบัญชีใหม่</CardTitle>
            <CardDescription>กรอกข้อมูลเพื่อสมัครสมาชิก</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="full_name">ชื่อ-นามสกุล *</Label>
                  <Input id="full_name" name="full_name" placeholder="ชื่อ-นามสกุล" value={form.full_name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">แผนก</Label>
                  <Input id="department" name="department" placeholder="แผนก" value={form.department} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">ชื่อผู้ใช้ *</Label>
                <Input id="username" name="username" placeholder="username" value={form.username} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">อีเมล *</Label>
                <Input id="email" name="email" type="email" placeholder="email@company.com" value={form.email} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="password">รหัสผ่าน *</Label>
                  <Input id="password" name="password" type="password" placeholder="อย่างน้อย 6 ตัว" value={form.password} onChange={handleChange} required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">ยืนยันรหัสผ่าน *</Label>
                  <Input id="confirm" name="confirm" type="password" placeholder="ยืนยัน" value={form.confirm} onChange={handleChange} required />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังสมัคร...</> : 'สมัครสมาชิก'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              มีบัญชีแล้ว?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">เข้าสู่ระบบ</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
