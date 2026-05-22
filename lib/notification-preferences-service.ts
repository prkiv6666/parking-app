import { supabase } from '../supabase'
import type { NotificationPreferences } from './home-screen'

export async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('enabled, radius_m, min_confidence, allow_free, allow_blue_zone, allow_paid')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    enabled: data.enabled,
    radius_m: data.radius_m,
    min_confidence: data.min_confidence,
    allow_free: data.allow_free,
    allow_blue_zone: data.allow_blue_zone,
    allow_paid: data.allow_paid,
  }
}

export async function persistNotificationPreferences(userId: string, preferences: NotificationPreferences) {
  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: userId,
      enabled: preferences.enabled,
      radius_m: preferences.radius_m,
      min_confidence: preferences.min_confidence,
      allow_free: preferences.allow_free,
      allow_blue_zone: preferences.allow_blue_zone,
      allow_paid: preferences.allow_paid,
    },
    { onConflict: 'user_id' }
  )

  return !error
}