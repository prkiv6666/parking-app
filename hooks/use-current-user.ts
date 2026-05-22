import { useCallback, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'

import { normalizeRewardProfile, type RewardProfile } from '../lib/rewards'
import { supabase } from '../supabase'

function getDefaultDisplayName(user: User) {
  const metadataName = user.user_metadata?.display_name

  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim()
  }

  return user.email?.split('@')[0] || 'Потребител'
}

async function ensureCurrentProfile(user: User) {
  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (existingError) {
    return {
      profile: null,
      error: existingError,
    }
  }

  if (existing) {
    return {
      profile: existing,
      error: null,
    }
  }

  const payload = {
    id: user.id,
    email: user.email ?? null,
    display_name: getDefaultDisplayName(user),
  }

  const { error: insertError } = await supabase.from('profiles').insert([payload])

  if (insertError) {
    return {
      profile: null,
      error: insertError,
    }
  }

  return {
    profile: payload,
    error: null,
  }
}

export function useCurrentUser() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<RewardProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const sessionUserId = session?.user?.id

  const refreshProfile = useCallback(async () => {
    if (!sessionUserId) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    try {
      setProfileLoading(true)

      if (!session?.user) {
        setProfile(null)
        return
      }

      const { profile: ensuredProfile, error } = await ensureCurrentProfile(session.user)

      if (error) {
        console.log('Load shared profile error:', error)
        return
      }

      setProfile(normalizeRewardProfile((ensuredProfile ?? null) as Record<string, unknown> | null))
    } catch (error) {
      console.log('Unexpected shared profile error:', error)
    } finally {
      setProfileLoading(false)
    }
  }, [session, sessionUserId])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!sessionUserId) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    let cancelled = false

    async function loadProfile() {
      await refreshProfile()

      if (cancelled) {
        return
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [refreshProfile, sessionUserId])

  return {
    session,
    profile,
    authLoading,
    profileLoading,
    refreshProfile,
  }
}