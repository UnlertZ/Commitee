import { Context, Next } from 'hono'
import { verify } from '../utils/jwt'

export interface JWTPayload {
  userId: number
  username: string
  permission: number
  iat?: number
  exp?: number
}

declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = authHeader.substring(7)
  try {
    const payload = await verify(token, c.env.JWT_SECRET) as JWTPayload
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}

export function requirePermission(minPermission: number) {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user || user.permission < minPermission) {
      return c.json({ error: 'Forbidden: insufficient permissions' }, 403)
    }
    await next()
  }
}
