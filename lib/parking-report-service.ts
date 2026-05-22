import { supabase } from '../supabase'
import type { ParkingReport, SpotType } from './home-screen'

export async function fetchActiveReports() {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('parking_reports')
    .select('*')
    .eq('status', 'active')
    .gt('expires_at', now)
    .order('created_at', { ascending: false })

  if (error) {
    return null
  }

  return (data as ParkingReport[]) || []
}

export async function createParkingReport(input: {
  userId: string
  latitude: number
  longitude: number
  spotType: SpotType
  reportDurationMs: number
}) {
  const expiresAt = new Date(Date.now() + input.reportDurationMs).toISOString()

  const { data, error } = await supabase
    .from('parking_reports')
    .insert([
      {
        latitude: input.latitude,
        longitude: input.longitude,
        expires_at: expiresAt,
        status: 'active',
        taken_count: 0,
        confirm_count: 0,
        spot_type: input.spotType,
        claimed_by: null,
        claimed_at: null,
        claim_expires_at: null,
        report_user_id: input.userId,
      },
    ])
    .select('id')
    .single()

  if (error) {
    return null
  }

  return data
}

export async function claimParkingReport(input: {
  reportId: string
  userId: string
  claimDurationMs: number
}) {
  const claimedAt = new Date().toISOString()
  const claimExpiresAt = new Date(Date.now() + input.claimDurationMs).toISOString()

  const { error } = await supabase
    .from('parking_reports')
    .update({
      claimed_by: input.userId,
      claimed_at: claimedAt,
      claim_expires_at: claimExpiresAt,
    })
    .eq('id', input.reportId)

  if (error) {
    return null
  }

  return {
    claimed_by: input.userId,
    claimed_at: claimedAt,
    claim_expires_at: claimExpiresAt,
  }
}

export async function confirmParkingReport(input: {
  reportId: string
  currentConfirmCount: number
  extensionMs: number
}) {
  const expiresAt = new Date(Date.now() + input.extensionMs).toISOString()
  const confirmCount = input.currentConfirmCount + 1

  const { error } = await supabase
    .from('parking_reports')
    .update({
      expires_at: expiresAt,
      confirm_count: confirmCount,
    })
    .eq('id', input.reportId)

  if (error) {
    return null
  }

  return {
    expires_at: expiresAt,
    confirm_count: confirmCount,
  }
}

export async function markParkingReportTaken(input: {
  reportId: string
  currentTakenCount: number
  clearClaim: boolean
}) {
  const payload = input.clearClaim
    ? {
        status: 'taken',
        taken_count: input.currentTakenCount + 1,
        claimed_by: null,
        claimed_at: null,
        claim_expires_at: null,
      }
    : {
        status: 'taken',
        taken_count: input.currentTakenCount + 1,
      }

  const { error } = await supabase
    .from('parking_reports')
    .update(payload)
    .eq('id', input.reportId)

  if (error) {
    return null
  }

  return {
    taken_count: input.currentTakenCount + 1,
  }
}

export async function updateParkingReportAiScore(input: {
  reportId: string
  aiConfidenceScore: number
  aiConfidenceReason?: string | null
  aiScoreVersion?: string | null
}) {
  const { error } = await supabase
    .from('parking_reports')
    .update({
      ai_confidence_score: Math.max(0, Math.min(100, Math.round(input.aiConfidenceScore))),
      ai_confidence_reason: input.aiConfidenceReason ?? null,
      ai_score_version: input.aiScoreVersion ?? null,
      ai_scored_at: new Date().toISOString(),
    })
    .eq('id', input.reportId)

  return !error
}