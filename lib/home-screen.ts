import type { User } from '@supabase/supabase-js'

export type SpotType = 'free' | 'blue_zone' | 'paid'
export type FilterType = 'all' | 'free' | 'blue_zone' | 'paid' | 'high_confidence'

export const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: 'Всички', value: 'all' },
  { label: 'Безплатни', value: 'free' },
  { label: 'Синя зона', value: 'blue_zone' },
  { label: 'Зелена зона', value: 'paid' },
  { label: 'Висок шанс', value: 'high_confidence' },
]

export type ParkingReport = {
  id: string
  latitude: number
  longitude: number
  status: string
  expires_at: string
  created_at?: string
  taken_count?: number
  confirm_count?: number
  spot_type?: SpotType
  claimed_by?: string | null
  claimed_at?: string | null
  claim_expires_at?: string | null
  report_user_id?: string | null
  successful_validation_count?: number
  author_penalized?: boolean
  invalidated_at?: string | null
  invalidated_by?: string | null
  ai_confidence_score?: number | null
  ai_confidence_reason?: string | null
  ai_score_version?: string | null
  ai_scored_at?: string | null
}

export type Profile = {
  id: string
  email: string | null
  display_name: string | null
  trust_score: number
  reports_count: number
  confirms_count: number
  taken_marks_count: number
  points: number
  rank: string
  badges: string[]
}

export type RewardToast = {
  title: string
  detail: string
}

export type AuthFieldErrors = {
  displayName: string
  email: string
  password: string
  confirmPassword: string
}

export type AuthMode = 'login' | 'register' | 'forgot_password' | 'reset_password'

export const CLAIM_DURATION_MS = 60 * 1000
export const REPORT_DURATION_MS = 3 * 60 * 1000
export const CONFIRM_EXTENSION_MS = 2 * 60 * 1000
export const STALE_REPORT_MS = 3 * 60 * 1000

export type NotificationPreferences = {
  enabled: boolean
  radius_m: number
  min_confidence: number
  allow_free: boolean
  allow_blue_zone: boolean
  allow_paid: boolean
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  radius_m: 500,
  min_confidence: 45,
  allow_free: true,
  allow_blue_zone: true,
  allow_paid: true,
}

export const DISPLAY_NAME_REGEX = /^(?=.{2,40}$)[A-Za-zА-Яа-я]+(?:[ ][A-Za-zА-Яа-я]+)*$/
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export const EMPTY_AUTH_ERRORS: AuthFieldErrors = {
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export function getAuthCallbackParams(url: string) {
  const [base, hashFragment] = url.split('#')
  const [, queryString = ''] = base.split('?')
  const queryParams = new URLSearchParams(queryString)
  const hashParams = new URLSearchParams(hashFragment || '')

  return {
    accessToken: hashParams.get('access_token') || queryParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token') || queryParams.get('refresh_token'),
    type: hashParams.get('type') || queryParams.get('type'),
    code: queryParams.get('code'),
  }
}

export function getDefaultDisplayName(user: User, fallbackName?: string) {
  const metadataName = user.user_metadata?.display_name

  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim()
  }

  if (fallbackName?.trim()) {
    return fallbackName.trim()
  }

  return user.email?.split('@')[0] || 'Потребител'
}

export function isClaimActive(report: ParkingReport) {
  if (!report.claim_expires_at) return false
  return new Date(report.claim_expires_at).getTime() > Date.now()
}

export function getMinutesLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  const minutes = Math.ceil(diff / 60000)
  return minutes > 0 ? minutes : 0
}

export function getClaimSecondsLeft(claimExpiresAt?: string | null) {
  if (!claimExpiresAt) return 0
  const diff = new Date(claimExpiresAt).getTime() - Date.now()
  const seconds = Math.ceil(diff / 1000)
  return seconds > 0 ? seconds : 0
}

export function getReportAgeSeconds(report: ParkingReport) {
  const createdAt = report.created_at || new Date().toISOString()
  return (Date.now() - new Date(createdAt).getTime()) / 1000
}

export function isReportStale(report: ParkingReport) {
  if (isClaimActive(report)) return false

  const confirmations = report.confirm_count || 0
  return confirmations === 0 && getReportAgeSeconds(report) >= STALE_REPORT_MS / 1000
}

export function getSpotTypeLabel(spotType?: SpotType) {
  switch (spotType) {
    case 'blue_zone':
      return 'Синя зона'
    case 'paid':
      return 'Зелена зона'
    case 'free':
    default:
      return 'Безплатно'
  }
}

export function getMarkerTitle(report: ParkingReport) {
  if (isClaimActive(report)) return 'Някой се насочва натам'

  switch (report.spot_type) {
    case 'blue_zone':
      return 'Свободно място - Синя зона'
    case 'paid':
      return 'Свободно място - Зелена зона'
    case 'free':
    default:
      return 'Свободно място - Безплатно'
  }
}

export function getMarkerColor(report: ParkingReport) {
  if (isClaimActive(report)) return 'orange'

  switch (report.spot_type) {
    case 'blue_zone':
      return 'blue'
    case 'paid':
      return 'forestgreen'
    case 'free':
    default:
      return 'teal'
  }
}

export function getHeuristicConfidence(report: ParkingReport) {
  const ageSeconds = getReportAgeSeconds(report)
  const confirmations = report.confirm_count || 0
  const takenMarks = report.taken_count || 0

  let score = 95

  if (ageSeconds > 30) score = 78
  if (ageSeconds > 60) score = 60
  if (ageSeconds > 90) score = 38
  if (ageSeconds > 120) score = 22
  if (ageSeconds > 180) score = 8

  score += Math.min(confirmations * 10, 25)
  score -= Math.min(takenMarks * 25, 60)

  if (confirmations === 0 && ageSeconds > 90) score -= 12

  if (isClaimActive(report)) score -= 20

  return Math.max(0, Math.min(100, score))
}

export function getConfidence(report: ParkingReport) {
  if (typeof report.ai_confidence_score === 'number') {
    return Math.max(0, Math.min(100, Math.round(report.ai_confidence_score)))
  }

  return getHeuristicConfidence(report)
}

export function getConfidenceSource(report: ParkingReport) {
  return typeof report.ai_confidence_score === 'number' ? 'ai' : 'heuristic'
}

export function getConfidenceLabel(score: number) {
  if (score >= 75) return 'Висок'
  if (score >= 45) return 'Среден'
  return 'Нисък'
}

export function getDistanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number
) {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const earthRadiusMeters = 6371000
  const latitudeDelta = toRadians(toLatitude - fromLatitude)
  const longitudeDelta = toRadians(toLongitude - fromLongitude)
  const startLatitude = toRadians(fromLatitude)
  const endLatitude = toRadians(toLatitude)

  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusMeters * c
}