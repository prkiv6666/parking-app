import { supabase } from '../supabase'
import { normalizeRewardProfile } from './rewards'
import type { Profile } from './home-screen'

type PersistedProfileFields = Pick<
  Profile,
  'trust_score' | 'reports_count' | 'confirms_count' | 'taken_marks_count' | 'display_name' | 'points' | 'rank' | 'badges'
>

function buildProfileUpdatePayload(currentProfile: Profile, updates: Partial<Profile>) {
  const nextProfile = {
    ...currentProfile,
    ...updates,
  }

  const payload: Partial<PersistedProfileFields> = {}

  if (Object.prototype.hasOwnProperty.call(updates, 'trust_score')) {
    payload.trust_score = nextProfile.trust_score
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'reports_count')) {
    payload.reports_count = nextProfile.reports_count
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'confirms_count')) {
    payload.confirms_count = nextProfile.confirms_count
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'taken_marks_count')) {
    payload.taken_marks_count = nextProfile.taken_marks_count
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'display_name')) {
    payload.display_name = nextProfile.display_name
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'points')) {
    payload.points = nextProfile.points
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'rank')) {
    payload.rank = nextProfile.rank
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'badges')) {
    payload.badges = nextProfile.badges
  }

  return {
    nextProfile,
    payload,
  }
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return normalizeRewardProfile(data as Record<string, unknown>) as Profile | null
}

export async function ensureProfileRecord(input: {
  userId: string
  email: string | null
  displayName: string
}) {
  const existingProfile = await fetchProfile(input.userId)

  if (existingProfile) {
    return existingProfile
  }

  const { error } = await supabase.from('profiles').insert([
    {
      id: input.userId,
      email: input.email,
      display_name: input.displayName,
    },
  ])

  if (error) {
    return null
  }

  return fetchProfile(input.userId)
}

export async function updateProfileStats(input: {
  userId: string
  currentProfile: Profile
  updates: Partial<Profile>
}) {
  const { nextProfile, payload } = buildProfileUpdatePayload(input.currentProfile, input.updates)

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', input.userId)

  if (error) {
    return null
  }

  return nextProfile
}