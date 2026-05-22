import { supabase } from '../supabase'

export type RewardEventType =
  | 'report_spot_reward'
  | 'actor_confirm_reward'
  | 'actor_taken_reward'
  | 'actor_park_reward'
  | 'author_confirm_bonus'
  | 'author_park_bonus'
  | 'author_invalid_penalty'

export type RewardProfile = {
  id: string
  email?: string | null
  display_name?: string | null
  car_plate?: string | null
  blue_zone_sms_number?: string | null
  green_zone_sms_number?: string | null
  invite_code?: string | null
  referred_by?: string | null
  referral_redeemed_at?: string | null
  invite_points_earned?: number
  trust_score: number
  reports_count: number
  confirms_count: number
  taken_marks_count: number
  points: number
  rank: string
  badges: string[]
}

export type BadgeProgress = {
  successful_reports_count: number
  park_here_count: number
}

export type RewardMutationResult = {
  applied: boolean
  profile: RewardProfile | null
  unlockedBadges: string[]
  reason?: string
}

export type RewardReport = {
  id: string
  report_user_id?: string | null
  confirm_count?: number
  created_at?: string
  successful_validation_count?: number
  author_penalized?: boolean
}

type AddPointsInput = {
  reportId: string
  targetUserId: string
  eventType: RewardEventType
  pointsDelta: number
  trustDelta?: number
  metadata?: Record<string, unknown>
}

const BADGE_LABELS = {
  firstSpot: 'Първо място',
  verifier: 'Потвърдител',
  closer: 'Финализатор',
  trustedDriver: 'Надежден шофьор',
  cityScout: 'Градски откривател',
  parkingLegend: 'Легенда на паркирането',
  reliableReporter: 'Надежден подател',
  fastParker: 'Бърз паркиращ',
} as const

const LEGACY_RANK_TRANSLATIONS: Record<string, string> = {
  'New Driver': 'Нов шофьор',
  Spotter: 'Наблюдател',
  'Parking Scout': 'Скаут за паркиране',
  'Parking Pro': 'Паркинг професионалист',
  'City Navigator': 'Градски навигатор',
  'Parking Legend': 'Легенда на паркирането',
}

const LEGACY_BADGE_TRANSLATIONS: Record<string, string> = {
  'First Spot': BADGE_LABELS.firstSpot,
  Verifier: BADGE_LABELS.verifier,
  Closer: BADGE_LABELS.closer,
  'Trusted Driver': BADGE_LABELS.trustedDriver,
  'City Scout': BADGE_LABELS.cityScout,
  'Parking Legend': BADGE_LABELS.parkingLegend,
  'Reliable Reporter': BADGE_LABELS.reliableReporter,
  'Fast Parker': BADGE_LABELS.fastParker,
}

export const QUICK_INVALID_THRESHOLD_SECONDS = 45

export function normalizeBadges(rawBadges: unknown): string[] {
  if (Array.isArray(rawBadges)) {
    return rawBadges
      .filter((badge): badge is string => typeof badge === 'string')
      .map((badge) => LEGACY_BADGE_TRANSLATIONS[badge] ?? badge)
  }

  if (typeof rawBadges === 'string') {
    try {
      const parsed = JSON.parse(rawBadges)
      return Array.isArray(parsed)
        ? parsed
            .filter((badge): badge is string => typeof badge === 'string')
            .map((badge) => LEGACY_BADGE_TRANSLATIONS[badge] ?? badge)
        : []
    } catch {
      return []
    }
  }

  return []
}

export function normalizeRewardProfile(rawProfile: Record<string, unknown> | null): RewardProfile | null {
  if (!rawProfile || typeof rawProfile.id !== 'string') return null

  return {
    id: rawProfile.id,
    email: typeof rawProfile.email === 'string' ? rawProfile.email : null,
    display_name: typeof rawProfile.display_name === 'string' ? rawProfile.display_name : null,
    car_plate: typeof rawProfile.car_plate === 'string' ? rawProfile.car_plate : null,
    blue_zone_sms_number:
      typeof rawProfile.blue_zone_sms_number === 'string' ? rawProfile.blue_zone_sms_number : null,
    green_zone_sms_number:
      typeof rawProfile.green_zone_sms_number === 'string' ? rawProfile.green_zone_sms_number : null,
    invite_code: typeof rawProfile.invite_code === 'string' ? rawProfile.invite_code : null,
    referred_by: typeof rawProfile.referred_by === 'string' ? rawProfile.referred_by : null,
    referral_redeemed_at:
      typeof rawProfile.referral_redeemed_at === 'string' ? rawProfile.referral_redeemed_at : null,
    invite_points_earned: Number(rawProfile.invite_points_earned ?? 0),
    trust_score: Number(rawProfile.trust_score ?? 0),
    reports_count: Number(rawProfile.reports_count ?? 0),
    confirms_count: Number(rawProfile.confirms_count ?? 0),
    taken_marks_count: Number(rawProfile.taken_marks_count ?? 0),
    points: Number(rawProfile.points ?? 0),
    rank:
      typeof rawProfile.rank === 'string'
        ? LEGACY_RANK_TRANSLATIONS[rawProfile.rank] ?? rawProfile.rank
        : updateRankFromPoints(Number(rawProfile.points ?? 0)),
    badges: normalizeBadges(rawProfile.badges),
  }
}

export function updateRankFromPoints(points: number) {
  if (points >= 600) return 'Легенда на паркирането'
  if (points >= 300) return 'Градски навигатор'
  if (points >= 150) return 'Паркинг професионалист'
  if (points >= 75) return 'Скаут за паркиране'
  if (points >= 25) return 'Наблюдател'
  return 'Нов шофьор'
}

export function applyBadgeRules(profile: RewardProfile, progress: BadgeProgress) {
  const badges: string[] = []

  if (profile.reports_count >= 1) badges.push(BADGE_LABELS.firstSpot)
  if (profile.confirms_count >= 10) badges.push(BADGE_LABELS.verifier)
  if (profile.taken_marks_count >= 10) badges.push(BADGE_LABELS.closer)
  if (profile.trust_score >= 70) badges.push(BADGE_LABELS.trustedDriver)
  if (profile.points >= 100) badges.push(BADGE_LABELS.cityScout)
  if (profile.points >= 500) badges.push(BADGE_LABELS.parkingLegend)
  if (progress.successful_reports_count >= 10) badges.push(BADGE_LABELS.reliableReporter)
  if (progress.park_here_count >= 5) badges.push(BADGE_LABELS.fastParker)

  return badges
}

export function isIndependentValidation(report: RewardReport, actorUserId?: string | null) {
  return !!actorUserId && !!report.report_user_id && actorUserId !== report.report_user_id
}

export function shouldPenalizeInvalidReport(report: RewardReport, actorUserId?: string | null) {
  if (!isIndependentValidation(report, actorUserId)) return false
  if (report.author_penalized) return false
  if ((report.confirm_count ?? 0) > 0) return false
  if (!report.created_at) return false

  const ageSeconds = (Date.now() - new Date(report.created_at).getTime()) / 1000
  return ageSeconds <= QUICK_INVALID_THRESHOLD_SECONDS
}

async function getBadgeProgress(userId: string): Promise<BadgeProgress> {
  const { data, error } = await supabase.rpc('get_reward_badge_progress', {
    p_user_id: userId,
  })

  if (error) {
    console.log('Get badge progress error:', error)
    return {
      successful_reports_count: 0,
      park_here_count: 0,
    }
  }

  return {
    successful_reports_count: Number(data?.successful_reports_count ?? 0),
    park_here_count: Number(data?.park_here_count ?? 0),
  }
}

async function syncRewardProfile(userId: string) {
  const { data, error } = await supabase.rpc('sync_reward_profile', {
    p_user_id: userId,
  })

  if (error) {
    console.log('Sync reward profile error:', error)
    return null
  }

  return normalizeRewardProfile((data?.profile ?? null) as Record<string, unknown> | null)
}

async function incrementSuccessfulReport(reportId: string) {
  const { error } = await supabase.rpc('increment_successful_report_validation', {
    p_report_id: reportId,
  })

  if (error) {
    console.log('Increment successful report validation error:', error)
  }
}

async function markReportAsPenalized(reportId: string, actorUserId: string) {
  const { error } = await supabase
    .from('parking_reports')
    .update({
      author_penalized: true,
      invalidated_at: new Date().toISOString(),
      invalidated_by: actorUserId,
    })
    .eq('id', reportId)
    .eq('author_penalized', false)

  if (error) {
    console.log('Mark penalized report error:', error)
  }
}

export async function addPointsToUser({
  reportId,
  targetUserId,
  eventType,
  pointsDelta,
  trustDelta = 0,
  metadata = {},
}: AddPointsInput): Promise<RewardMutationResult> {
  const { data, error } = await supabase.rpc('apply_reward_event', {
    p_report_id: reportId,
    p_target_user_id: targetUserId,
    p_event_type: eventType,
    p_points_delta: pointsDelta,
    p_trust_delta: trustDelta,
    p_metadata: metadata,
  })

  if (error) {
    console.log('Apply reward event error:', error)
    return {
      applied: false,
      profile: null,
      unlockedBadges: [],
      reason: error.message,
    }
  }

  if (!data?.applied) {
    return {
      applied: false,
      profile: null,
      unlockedBadges: [],
      reason: typeof data?.reason === 'string' ? data.reason : 'duplicate',
    }
  }

  const rawProfile = normalizeRewardProfile((data.profile ?? null) as Record<string, unknown> | null)

  if (!rawProfile) {
    return {
      applied: false,
      profile: null,
      unlockedBadges: [],
      reason: 'missing_profile',
    }
  }

  const previousBadges = normalizeBadges(data.previous_badges)
  const progress = await getBadgeProgress(targetUserId)
  const computedProfile: RewardProfile = {
    ...rawProfile,
    rank: updateRankFromPoints(rawProfile.points),
  }
  const computedBadges = applyBadgeRules(computedProfile, progress)
  const unlockedBadges = computedBadges.filter((badge) => !previousBadges.includes(badge))
  const syncedProfile = await syncRewardProfile(targetUserId)

  return {
    applied: true,
    profile: syncedProfile ?? { ...computedProfile, badges: computedBadges },
    unlockedBadges,
  }
}

export async function rewardReportAuthorOnConfirm(report: RewardReport, actorUserId: string) {
  if (!report.report_user_id || !isIndependentValidation(report, actorUserId)) {
    return {
      applied: false,
      profile: null,
      unlockedBadges: [],
      reason: 'self_validation',
    } satisfies RewardMutationResult
  }

  const result = await addPointsToUser({
    reportId: report.id,
    targetUserId: report.report_user_id,
    eventType: 'author_confirm_bonus',
    pointsDelta: 5,
    trustDelta: 4,
    metadata: { source: 'confirm_still_free' },
  })

  if (result.applied) {
    await incrementSuccessfulReport(report.id)
  }

  return result
}

export async function rewardReportAuthorOnParkHere(report: RewardReport, actorUserId: string) {
  if (!report.report_user_id || !isIndependentValidation(report, actorUserId)) {
    return {
      applied: false,
      profile: null,
      unlockedBadges: [],
      reason: 'self_validation',
    } satisfies RewardMutationResult
  }

  const result = await addPointsToUser({
    reportId: report.id,
    targetUserId: report.report_user_id,
    eventType: 'author_park_bonus',
    pointsDelta: 10,
    trustDelta: 6,
    metadata: { source: 'park_here' },
  })

  if (result.applied) {
    await incrementSuccessfulReport(report.id)
  }

  return result
}

export async function penalizeAuthorForInvalidReport(report: RewardReport, actorUserId: string) {
  if (!report.report_user_id || !shouldPenalizeInvalidReport(report, actorUserId)) {
    return {
      applied: false,
      profile: null,
      unlockedBadges: [],
      reason: 'not_penalized',
    } satisfies RewardMutationResult
  }

  const result = await addPointsToUser({
    reportId: report.id,
    targetUserId: report.report_user_id,
    eventType: 'author_invalid_penalty',
    pointsDelta: -8,
    trustDelta: -12,
    metadata: { reason: 'quickly_marked_taken' },
  })

  if (result.applied) {
    await markReportAsPenalized(report.id, actorUserId)
  }

  return result
}