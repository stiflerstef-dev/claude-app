/**
 * auth.ts — Authentication helpers for daemon and app clients.
 * Daemon: static token from env.
 * App: HS256 JWT signed with APP_SECRET.
 */

import jwt from 'jsonwebtoken'

const DAEMON_TOKEN = process.env.DAEMON_TOKEN ?? ''
const APP_SECRET = process.env.APP_SECRET ?? 'change-me-app-jwt-secret'
const TOKEN_EXPIRY = '24h'

export interface AppTokenPayload {
  user_id: string
  device_id: string
  iat: number
  exp: number
}

export function validateDaemonToken(token: string): boolean {
  if (!DAEMON_TOKEN) {
    throw new Error('DAEMON_TOKEN env variable not set')
  }
  return token === DAEMON_TOKEN
}

export function createAppToken(userId: string, deviceId: string): string {
  if (!APP_SECRET) {
    throw new Error('APP_SECRET env variable not set')
  }
  return jwt.sign({ user_id: userId, device_id: deviceId }, APP_SECRET, {
    expiresIn: TOKEN_EXPIRY,
    algorithm: 'HS256',
  })
}

export function validateAppToken(token: string): AppTokenPayload {
  if (!token) throw new Error('No token provided')
  try {
    const payload = jwt.verify(token, APP_SECRET, {
      algorithms: ['HS256'],
    }) as AppTokenPayload
    return payload
  } catch (err) {
    throw new Error('Invalid or expired token')
  }
}
