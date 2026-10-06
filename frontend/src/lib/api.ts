const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (data: RegisterData) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // Users
  getMe: () => request<User>('/api/users/me'),
  getUsers: () => request<User[]>('/api/users'),
  createUser: (data: CreateUserData) =>
    request('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: Partial<User> & { password?: string }) =>
    request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deactivateUser: (id: number) =>
    request(`/api/users/${id}`, { method: 'DELETE' }),

  // Committee Days
  getCommitteeDays: (params?: { month?: string; status?: string }) => {
    const q = new URLSearchParams(params as any).toString()
    return request<CommitteeDay[]>(`/api/committee-days${q ? '?' + q : ''}`)
  },
  getActiveDay: () => request<CommitteeDay | null>('/api/committee-days/active'),
  getCommitteeDay: (id: number) => request<CommitteeDay>(`/api/committee-days/${id}`),
  createCommitteeDay: (data: CreateCommitteeDayData) =>
    request('/api/committee-days', { method: 'POST', body: JSON.stringify(data) }),
  closeCommitteeDay: (id: number) =>
    request(`/api/committee-days/${id}/close`, { method: 'PATCH' }),
  reopenCommitteeDay: (id: number) =>
    request(`/api/committee-days/${id}/reopen`, { method: 'PATCH' }),
  deleteCommitteeDay: (id: number) =>
    request(`/api/committee-days/${id}`, { method: 'DELETE' }),

  // Safety Issues
  getSafetyIssues: (params?: { month?: string; committee_day_id?: string; status?: string }) => {
    const q = new URLSearchParams(params as any).toString()
    return request<SafetyIssue[]>(`/api/safety-issues${q ? '?' + q : ''}`)
  },
  getSafetyIssue: (id: number) => request<SafetyIssue>(`/api/safety-issues/${id}`),
  submitIssue: (data: SubmitIssueData) =>
    request('/api/safety-issues', { method: 'POST', body: JSON.stringify(data) }),
  resolveIssue: (id: number, data: ResolveIssueData) =>
    request(`/api/safety-issues/${id}/resolve`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateIssue: (id: number, data: Partial<SafetyIssue>) =>
    request(`/api/safety-issues/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Export
  getExportData: (period: string, include: string) =>
    request<ExportResponse>(`/api/export/data?period=${period}&include=${include}`),
}

// Types
export interface User {
  id: number
  username: string
  email: string
  full_name: string
  department?: string
  permission: number
  is_active: number
  created_at: string
}

export interface CommitteeDay {
  id: number
  title: string
  inspection_date: string
  month_year: string
  location?: string
  description?: string
  status: 'open' | 'closed'
  created_by: number
  creator_name: string
  created_at: string
  closed_at?: string
}

export interface SafetyIssue {
  id: number
  issue_code: string
  committee_day_id: number
  committee_title: string
  inspection_date: string
  submitted_by: number
  submitter_name: string
  submitter_dept?: string
  issue_type: 'person' | 'condition'
  location?: string
  description: string
  remarks?: string
  image_before?: string
  image_after?: string
  status: 'pending' | 'in_progress' | 'resolved'
  resolver_name?: string
  resolve_remarks?: string
  resolved_at?: string
  month_year: string
  created_at: string
  updated_at: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  full_name: string
  department?: string
}

export interface CreateUserData extends RegisterData {
  permission: number
}

export interface CreateCommitteeDayData {
  title: string
  inspection_date: string
  location?: string
  description?: string
}

export interface SubmitIssueData {
  committee_day_id: number
  issue_type: 'person' | 'condition'
  location?: string
  description: string
  remarks?: string
  image_before?: string
}

export interface ResolveIssueData {
  image_after?: string
  resolve_remarks?: string
  status?: string
}

export interface ExportResponse {
  period: string
  total: number
  data: any[]
}
