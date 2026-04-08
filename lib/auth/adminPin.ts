const ADMIN_SESSION_KEY = 'hospital-directory-admin-session'
const DEFAULT_TTL_MINUTES = 15

type AdminSessionRecord = {
  unlockedUntil: number
}

function getConfiguredPinHash() {
  return process.env.NEXT_PUBLIC_ADMIN_PIN_HASH?.trim() ?? ''
}

function getSessionTtlMs() {
  const ttl = Number(process.env.NEXT_PUBLIC_ADMIN_SESSION_TTL_MINUTES ?? DEFAULT_TTL_MINUTES)

  if (!Number.isFinite(ttl) || ttl <= 0) {
    return DEFAULT_TTL_MINUTES * 60 * 1000
  }

  return ttl * 60 * 1000
}

export function isAdminPinConfigured() {
  return getConfiguredPinHash().length > 0
}

export function isValidPin(pin: string) {
  return /^\d{4,8}$/.test(pin)
}

export async function hashPin(pin: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyAdminPin(pin: string) {
  const configuredHash = getConfiguredPinHash()

  if (!configuredHash) {
    return false
  }

  const submittedHash = await hashPin(pin)
  return submittedHash === configuredHash
}

export function storeAdminSession() {
  const record: AdminSessionRecord = {
    unlockedUntil: Date.now() + getSessionTtlMs(),
  }

  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(record))
  return record
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
}

export function readAdminSession() {
  const raw = sessionStorage.getItem(ADMIN_SESSION_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as AdminSessionRecord

    if (!parsed.unlockedUntil || parsed.unlockedUntil <= Date.now()) {
      clearAdminSession()
      return null
    }

    return parsed
  } catch {
    clearAdminSession()
    return null
  }
}

export function refreshAdminSession() {
  if (!readAdminSession()) {
    return null
  }

  return storeAdminSession()
}

export function getRemainingSessionMinutes() {
  const session = readAdminSession()

  if (!session) {
    return 0
  }

  return Math.max(0, Math.ceil((session.unlockedUntil - Date.now()) / 60000))
}
