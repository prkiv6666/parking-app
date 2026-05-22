import { useEffect, useRef } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

import type { ParkingReport } from '../lib/home-screen'
import { supabase } from '../supabase'

type UseLiveParkingReportsInput = {
  sessionUserId?: string
  onResetAuthForm: () => void
  onSignedOutCleanup: () => void
  onHydrateSignedInState: () => void
  onRefreshLiveData: () => void
  onRealtimeReportChange: (payload: RealtimePostgresChangesPayload<ParkingReport>) => void
  refreshIntervalMs?: number
}

export function useLiveParkingReports({
  sessionUserId,
  onResetAuthForm,
  onSignedOutCleanup,
  onHydrateSignedInState,
  onRefreshLiveData,
  onRealtimeReportChange,
  refreshIntervalMs = 5000,
}: UseLiveParkingReportsInput) {
  const resetAuthFormRef = useRef(onResetAuthForm)
  const signedOutCleanupRef = useRef(onSignedOutCleanup)
  const hydrateSignedInStateRef = useRef(onHydrateSignedInState)
  const refreshLiveDataRef = useRef(onRefreshLiveData)
  const realtimeReportChangeRef = useRef(onRealtimeReportChange)

  resetAuthFormRef.current = onResetAuthForm
  signedOutCleanupRef.current = onSignedOutCleanup
  hydrateSignedInStateRef.current = onHydrateSignedInState
  refreshLiveDataRef.current = onRefreshLiveData
  realtimeReportChangeRef.current = onRealtimeReportChange

  useEffect(() => {
    if (!sessionUserId) {
      resetAuthFormRef.current()
    }
  }, [sessionUserId])

  useEffect(() => {
    if (!sessionUserId) {
      signedOutCleanupRef.current()
      return
    }

    hydrateSignedInStateRef.current()

    const interval = setInterval(() => {
      refreshLiveDataRef.current()
    }, refreshIntervalMs)

    const channel = supabase
      .channel('parking-reports-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parking_reports' },
        (payload) => {
          realtimeReportChangeRef.current(payload as RealtimePostgresChangesPayload<ParkingReport>)
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [refreshIntervalMs, sessionUserId])
}