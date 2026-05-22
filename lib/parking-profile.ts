import { Linking, Platform } from 'react-native'
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js'

import { supabase } from '../supabase'

export type ParkingProfileSettings = {
  carPlate: string
  blueZoneSmsNumber: string
  greenZoneSmsNumber: string
}

export function normalizePlate(value: string) {
  return value.replace(/\s+/g, '').toUpperCase()
}

export async function saveParkingProfile(userId: string, settings: ParkingProfileSettings) {
  const payload = {
    car_plate: normalizePlate(settings.carPlate),
    blue_zone_sms_number: settings.blueZoneSmsNumber.trim(),
    green_zone_sms_number: settings.greenZoneSmsNumber.trim(),
  }

  const { error } = await supabase.from('profiles').update(payload).eq('id', userId)

  return {
    success: !error,
    error,
  }
}

export async function redeemInviteCode(inviteCode: string) {
  const { data, error } = await supabase.rpc('redeem_invite_code', {
    p_invite_code: inviteCode.trim().toUpperCase(),
  })

  return {
    data,
    error,
  }
}

export async function deleteMyAccount() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    return {
      data: null,
      error: sessionError,
      mode: 'failed' as const,
    }
  }

  if (!session?.access_token) {
    return {
      data: null,
      error: new Error('Сесията е изтекла. Влез отново и опитай пак.'),
      mode: 'failed' as const,
    }
  }

  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!error) {
    return {
      data,
      error: null,
      mode: 'full-account' as const,
    }
  }

  if (error instanceof FunctionsHttpError) {
    const response = error.context
    let message = `Не успяхме да изтрием акаунта в момента. (${response.status})`

    try {
      const bodyText = await response.text()

      if (bodyText.trim()) {
        try {
          const body = JSON.parse(bodyText)

          if (typeof body?.error === 'string' && body.error.trim()) {
            message = body.error.trim()
          } else {
            message = bodyText.trim()
          }
        } catch {
          message = bodyText.trim()
        }
      }
    } catch {
      message = error.message || message
    }

    return {
      data: null,
      error: new Error(message),
      mode: 'failed' as const,
    }
  }

  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    return {
      data: null,
      error: new Error('Не успяхме да се свържем със сървъра за изтриване на акаунта.'),
      mode: 'failed' as const,
    }
  }

  return {
    data: null,
    error,
    mode: 'failed' as const,
  }
}

export async function openSmsComposer(phoneNumber: string, carPlate: string) {
  const normalizedPlate = normalizePlate(carPlate)
  const normalizedNumber = phoneNumber.trim()

  if (!normalizedNumber || !normalizedPlate) {
    return {
      success: false,
      reason: 'missing_data',
    }
  }

  const separator = Platform.OS === 'ios' ? '&' : '?'
  const url = `sms:${normalizedNumber}${separator}body=${encodeURIComponent(normalizedPlate)}`

  const canOpen = await Linking.canOpenURL(url)

  if (!canOpen) {
    return {
      success: false,
      reason: 'unavailable',
    }
  }

  await Linking.openURL(url)

  return {
    success: true,
    reason: 'opened',
  }
}