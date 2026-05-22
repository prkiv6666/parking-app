import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'

import type { NotificationPreferences, ParkingReport } from '../lib/home-screen'
import { supabase } from '../supabase'

type UseNearbyReportNotificationsInput = {
  sessionUserId?: string
  location: { latitude: number; longitude: number } | null
  notificationPreferences: NotificationPreferences
  notificationPermissionGranted: boolean
  enabled: boolean
  onInsertedReport: (report: ParkingReport) => Promise<void>
}

export function useNearbyReportNotifications({
  sessionUserId,
  location,
  notificationPreferences,
  notificationPermissionGranted,
  enabled,
  onInsertedReport,
}: UseNearbyReportNotificationsInput) {
  const onInsertedReportRef = useRef(onInsertedReport)

  onInsertedReportRef.current = onInsertedReport

  useEffect(() => {
    const hasLocation = !!location

    if (
      !enabled ||
      !sessionUserId ||
      !hasLocation ||
      !notificationPreferences.enabled ||
      !notificationPermissionGranted ||
      Platform.OS === 'web'
    ) {
      return
    }

    const channel = supabase
      .channel('nearby-parking-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'parking_reports' },
        async (payload) => {
          await onInsertedReportRef.current(payload.new as ParkingReport)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [
    enabled,
    sessionUserId,
    location,
    location?.latitude,
    location?.longitude,
    notificationPreferences.enabled,
    notificationPreferences.radius_m,
    notificationPreferences.min_confidence,
    notificationPreferences.allow_free,
    notificationPreferences.allow_blue_zone,
    notificationPreferences.allow_paid,
    notificationPermissionGranted,
  ])
}