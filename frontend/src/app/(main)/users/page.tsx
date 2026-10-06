'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, User } from '@/lib/api'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, UserCheck, UserX, Pencil, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { permissionLabel, permissionColor } from '@/lib/utils'

export default function UsersPage() {
  const { user: me } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', department: '', permission: '0' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getUsers()
      setUsers(data)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'โหลดข้อมูลไม่สำเร็จ', description: e.message })
    } finally { setLoading(false) }
  }, [toast])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createUser({ ...form, permission: Number(form.permission) })
      toast({ title: 'สร้างผู้ใช้สำเร็จ' })
      setCreateOpen(false)
      setForm({ username: '', email: '', password: '', full_name: '', department: '', permission: '0' })
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ไม่สำเร็จ', description: e.message })
    } finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editUser) return
    setSaving(true)
    try {
      const data: any = { full_name: form.full_name, department: form.department, permission: Number(form.permission) }
      if (form.password) data.password = form.password
      await api.updateUser(editUser.id, data)
      toast({ title: 'อัพเดทสำเร็จ' })
      setEditUser(null)
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ไม่สำเร็จ', description: e.message })
    } finally { setSaving(false) }
  }

  async function toggleActive(u: User) {
    try {
      if (u.is_active) {
        await api.deactivateUser(u.id)
        toast({ title: 'ปิดใช้งานผู้ใช้แล้ว' })
      } else {
        await api.updateUser(u.id, { is_active: 1 } as any)
        toast({ title: 'เปิดใช้งานผู้ใช้แล้ว' })
      }
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ไม่สำเร็จ', description: e.message })
    }
  }

  function openEdit(u: User) {
    setEditUser(u)
    setForm({ username: u.username, email: u.email, password: '', full_name: u.full_name, department: u.department || '', permission: String(u.permission) })
  }

  if (me && me.permission < 2) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldCheck className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">จัดการผู้ใช้</h1>
          <p className="text-muted-foreground mt-1">User Management (Super Admin)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button onClick={() => { setForm({ username: '', email: '', password: '', full_name: '', department: '', permission: '0' }); setCreateOpen(true) }}>
            <Plus className="w-4 h-4" /> เพิ่มผู้ใช้
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map(p => (
          <Card key={p}>
            <CardContent className="p-5 text-center">
              <p className="text-2xl font-bold">{users.filter(u => u.permission === p).length}</p>
              <p className="text-sm text-muted-foreground mt-1">{permissionLabel(p)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ผู้ใช้ทั้งหมด ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="divide-y divide-border">
              {users.map(u => (
                <div key={u.id} className={`p-4 flex items-center gap-4 ${!u.is_active ? 'opacity-50' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {u.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{u.full_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${permissionColor(u.permission)}`}>
                        {permissionLabel(u.permission)}
                      </span>
                      {!u.is_active && <Badge variant="secondary">ปิดใช้งาน</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground flex gap-3 mt-0.5">
                      <span>@{u.username}</span>
                      <span>{u.email}</span>
                      {u.department && <span>{u.department}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {u.id !== me?.id && (
                      <Button
                        variant="outline" size="sm"
                        className={u.is_active ? 'text-destructive border-destructive/20 hover:bg-destructive/5' : 'text-green-600 border-green-200 hover:bg-green-50'}
                        onClick={() => toggleActive(u)}
                      >
                        {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>ชื่อ-นามสกุล *</Label>
                <Input placeholder="ชื่อ-นามสกุล" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>แผนก</Label>
                <Input placeholder="แผนก" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>ชื่อผู้ใช้ *</Label>
              <Input placeholder="username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>อีเมล *</Label>
              <Input type="email" placeholder="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>รหัสผ่าน *</Label>
              <Input type="password" placeholder="อย่างน้อย 6 ตัว" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label>ระดับสิทธิ์</Label>
              <Select value={form.permission} onValueChange={v => setForm(f => ({ ...f, permission: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">P0 - User</SelectItem>
                  <SelectItem value="1">P1 - Admin</SelectItem>
                  <SelectItem value="2">P2 - Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังสร้าง...</> : 'สร้างผู้ใช้'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={o => !o && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>แก้ไขผู้ใช้ — {editUser?.username}</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>ชื่อ-นามสกุล</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>แผนก</Label>
                <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</Label>
              <Input type="password" placeholder="รหัสผ่านใหม่" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>ระดับสิทธิ์</Label>
              <Select value={form.permission} onValueChange={v => setForm(f => ({ ...f, permission: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">P0 - User</SelectItem>
                  <SelectItem value="1">P1 - Admin</SelectItem>
                  <SelectItem value="2">P2 - Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>ยกเลิก</Button>
              <Button type="submit" disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</> : 'บันทึก'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
