'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, CalendarCheck, FileText, Plus, Users, Download, Shield, LogOut, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavItem {
  href: string
  label: string
  labelEn: string
  icon: React.ComponentType<{ className?: string }>
  minPermission?: number
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'แดชบอร์ด', labelEn: 'Dashboard', icon: LayoutDashboard },
  { href: '/committee-days', label: 'วันตรวจความปลอดภัย', labelEn: 'Committee Days', icon: CalendarCheck },
  { href: '/submit-issue', label: 'ส่งเรื่องเข้าระบบ', labelEn: 'Submit Issue', icon: Plus },
  { href: '/issues', label: 'รายการทั้งหมด', labelEn: 'All Issues', icon: FileText },
  { href: '/export', label: 'ส่งออกข้อมูล', labelEn: 'Export', icon: Download, minPermission: 1 },
  { href: '/users', label: 'จัดการผู้ใช้', labelEn: 'User Management', icon: Users, minPermission: 2 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-foreground">Safety Committee</div>
            <div className="text-xs text-muted-foreground">jdecommitee</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const show = !item.minPermission || (user && user.permission >= item.minPermission)
          if (!show) return null
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3" />}
            </Link>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg bg-muted">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{user?.full_name}</div>
            <div className="text-xs text-muted-foreground">
              {user?.permission === 2 ? 'Super Admin' : user?.permission === 1 ? 'Admin' : 'User'}
            </div>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive" onClick={logout}>
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </Button>
      </div>
    </aside>
  )
}
