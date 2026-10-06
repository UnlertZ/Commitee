import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function formatThaiDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function getMonthYear(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function permissionLabel(p: number): string {
  return p === 2 ? 'Super Admin (P2)' : p === 1 ? 'Admin (P1)' : 'User (P0)'
}

export function permissionColor(p: number): string {
  return p === 2
    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    : p === 1
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

export function issueTypeLabel(t: string): string {
  return t === 'person' ? 'อันตรายจากบุคคล' : 'อันตรายจากสภาพงาน'
}

export function statusLabel(s: string): string {
  return s === 'resolved' ? 'แก้ไขแล้ว' : s === 'in_progress' ? 'กำลังแก้ไข' : 'รอดำเนินการ'
}

export function statusColor(s: string): string {
  return s === 'resolved'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    : s === 'in_progress'
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
}
