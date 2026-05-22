import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

import {
  openSmsComposer,
  redeemInviteCode,
  saveParkingProfile,
} from '../../lib/parking-profile'
import { useCurrentUser } from '../../hooks/use-current-user'
import { supabase } from '../../supabase'

const DISPLAY_NAME_REGEX = /^(?=.{2,40}$)[A-Za-zА-Яа-я]+(?:[ ][A-Za-zА-Яа-я]+)*$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AccountFieldErrors = {
  displayName: string
  email: string
}

const EMPTY_ACCOUNT_ERRORS: AccountFieldErrors = {
  displayName: '',
  email: '',
}

export default function ProfileScreen() {
  const { session, profile, authLoading, profileLoading, refreshProfile } = useCurrentUser()
  const [accountDisplayName, setAccountDisplayName] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [accountErrors, setAccountErrors] = useState<AccountFieldErrors>(EMPTY_ACCOUNT_ERRORS)
  const [accountStatus, setAccountStatus] = useState('')
  const [carPlate, setCarPlate] = useState('')
  const [blueZoneSmsNumber, setBlueZoneSmsNumber] = useState('')
  const [greenZoneSmsNumber, setGreenZoneSmsNumber] = useState('')
  const [inviteCodeInput, setInviteCodeInput] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [redeemingInvite, setRedeemingInvite] = useState(false)
  const [inviteHistory, setInviteHistory] = useState<
    {
      id: string
      invited_user_id: string
      invited_points: number
      inviter_points: number
      created_at: string
      invited_label: string
    }[]
  >([])
  const [inviteHistoryLoading, setInviteHistoryLoading] = useState(false)

  useEffect(() => {
    setAccountDisplayName(profile?.display_name ?? '')
    setAccountEmail(session?.user?.email ?? profile?.email ?? '')
    setAccountErrors(EMPTY_ACCOUNT_ERRORS)
    setAccountStatus('')
    setCarPlate(profile?.car_plate ?? '')
    setBlueZoneSmsNumber(profile?.blue_zone_sms_number ?? '')
    setGreenZoneSmsNumber(profile?.green_zone_sms_number ?? '')
  }, [
    profile?.display_name,
    profile?.email,
    profile?.blue_zone_sms_number,
    profile?.car_plate,
    profile?.green_zone_sms_number,
    session?.user?.email,
  ])

  const hasParkingProfile = useMemo(() => {
    return !!profile?.car_plate
  }, [profile?.car_plate])

  const pendingEmail = session?.user?.new_email?.trim() || ''

  function clearAccountError(field: keyof AccountFieldErrors) {
    setAccountErrors((current) => {
      if (!current[field]) return current

      return {
        ...current,
        [field]: '',
      }
    })
  }

  function handleAccountDisplayNameChange(value: string) {
    setAccountDisplayName(value)
    clearAccountError('displayName')
    setAccountStatus('')
  }

  function handleAccountEmailChange(value: string) {
    setAccountEmail(value)
    clearAccountError('email')
    setAccountStatus('')
  }

  useEffect(() => {
    if (!session?.user) {
      setInviteHistory([])
      setInviteHistoryLoading(false)
      return
    }

    const userId = session.user.id

    let cancelled = false

    async function loadInviteHistory() {
      try {
        setInviteHistoryLoading(true)

        const { data, error } = await supabase
          .from('friend_invites')
          .select('id, invited_user_id, invited_points, inviter_points, created_at')
          .eq('inviter_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) {
          console.log('Load invite history error:', error)
          return
        }

        const rows = (data as {
          id: string
          invited_user_id: string
          invited_points: number
          inviter_points: number
          created_at: string
        }[]) || []

        const invitedIds = rows.map((row) => row.invited_user_id)
        let profilesMap = new Map<string, string>()

        if (invitedIds.length > 0) {
          const { data: invitedProfiles, error: invitedProfilesError } = await supabase
            .from('profiles')
            .select('id, display_name, email')
            .in('id', invitedIds)

          if (invitedProfilesError) {
            console.log('Load invited profile labels error:', invitedProfilesError)
          } else {
            profilesMap = new Map(
              ((invitedProfiles as { id: string; display_name?: string | null; email?: string | null }[]) || []).map(
                (item) => [item.id, item.display_name || item.email || `Потребител ${item.id.slice(0, 6)}`]
              )
            )
          }
        }

        if (!cancelled) {
          setInviteHistory(
            rows.map((row) => ({
              ...row,
              invited_label: profilesMap.get(row.invited_user_id) || `Потребител ${row.invited_user_id.slice(0, 6)}`,
            }))
          )
        }
      } catch (error) {
        console.log('Unexpected invite history error:', error)
      } finally {
        if (!cancelled) setInviteHistoryLoading(false)
      }
    }

    loadInviteHistory()

    return () => {
      cancelled = true
    }
  }, [session?.user])

  async function handleSaveParkingProfile() {
    if (!session?.user) return

    if (!carPlate.trim()) {
      Alert.alert('Липсва информация', 'Въведи регистрационен номер на колата.')
      return
    }

    try {
      setSavingProfile(true)

      const result = await saveParkingProfile(session.user.id, {
        carPlate,
        blueZoneSmsNumber,
        greenZoneSmsNumber,
      })

      if (!result.success) {
        Alert.alert('Грешка', 'Неуспешно запазване на паркинг профила.')
        return
      }

      await refreshProfile()
      Alert.alert('Готово', 'Паркинг профилът е запазен.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSaveAccountDetails() {
    if (!session?.user || !profile) return

    const normalizedDisplayName = accountDisplayName.trim()
    const normalizedEmail = accountEmail.trim().toLowerCase()
    const currentDisplayName = (profile.display_name ?? '').trim()
    const currentEmail = (session.user.email ?? profile.email ?? '').trim().toLowerCase()
    const displayNameChanged = normalizedDisplayName !== currentDisplayName
    const emailChanged = normalizedEmail !== currentEmail

    setAccountStatus('')

    if (!normalizedDisplayName) {
      setAccountErrors({
        ...EMPTY_ACCOUNT_ERRORS,
        displayName: 'Въведи име за профила.',
      })
      return
    }

    if (!DISPLAY_NAME_REGEX.test(normalizedDisplayName)) {
      setAccountErrors({
        ...EMPTY_ACCOUNT_ERRORS,
        displayName: 'Името трябва да е между 2 и 40 символа и да съдържа само букви и интервали.',
      })
      return
    }

    if (!normalizedEmail) {
      setAccountErrors({
        ...EMPTY_ACCOUNT_ERRORS,
        email: 'Въведи имейл адрес.',
      })
      return
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setAccountErrors({
        ...EMPTY_ACCOUNT_ERRORS,
        email: 'Въведи валиден имейл адрес.',
      })
      return
    }

    if (!displayNameChanged && !emailChanged) {
      setAccountStatus('Няма промени за запазване.')
      return
    }

    try {
      setSavingAccount(true)
      setAccountErrors(EMPTY_ACCOUNT_ERRORS)

      if (displayNameChanged) {
        const { error: authNameError } = await supabase.auth.updateUser({
          data: { display_name: normalizedDisplayName },
        })

        if (authNameError) {
          setAccountErrors({
            ...EMPTY_ACCOUNT_ERRORS,
            displayName: authNameError.message || 'Неуспешна промяна на името.',
          })
          return
        }

        const { error: profileNameError } = await supabase
          .from('profiles')
          .update({ display_name: normalizedDisplayName })
          .eq('id', session.user.id)

        if (profileNameError) {
          setAccountErrors({
            ...EMPTY_ACCOUNT_ERRORS,
            displayName: profileNameError.message || 'Неуспешно запазване на името.',
          })
          return
        }
      }

      if (emailChanged) {
        const { error: authEmailError } = await supabase.auth.updateUser({
          email: normalizedEmail,
        })

        if (authEmailError) {
          const message = authEmailError.message?.toLowerCase().includes('already')
            ? 'Вече има акаунт с този имейл.'
            : authEmailError.message || 'Неуспешна промяна на имейла.'

          setAccountErrors({
            ...EMPTY_ACCOUNT_ERRORS,
            email: message,
          })
          return
        }
      }

      await refreshProfile()

      if (emailChanged) {
        setAccountStatus('Изпратихме потвърждение за новия имейл адрес. Промяната ще завърши след потвърждение.')
        return
      }

      setAccountStatus('Данните на профила са обновени.')
    } finally {
      setSavingAccount(false)
    }
  }

  async function handleOpenZoneSms(zoneType: 'blue' | 'green') {
    const smsNumber = zoneType === 'blue' ? blueZoneSmsNumber : greenZoneSmsNumber
    const result = await openSmsComposer(smsNumber, carPlate)

    if (result.success) return

    if (result.reason === 'missing_data') {
      Alert.alert('Липсва информация', 'Добави регистрационен номер и SMS номер за зоната.')
      return
    }

    Alert.alert('Няма поддръжка', 'Не успях да отворя приложението за SMS на това устройство.')
  }

  async function handleShareInvite() {
    if (!profile?.invite_code) {
      Alert.alert('Липсва код', 'Кодът за покана ще се появи след като профилът е зареден.')
      return
    }

    await Share.share({
      message: `Ела в ParkRadar с моя код ${profile.invite_code}. Аз получавам 15 точки, а ти 10.`,
    })
  }

  async function handleRedeemInvite() {
    if (!inviteCodeInput.trim()) {
      Alert.alert('Липсва код', 'Въведи код за покана.')
      return
    }

    try {
      setRedeemingInvite(true)
      const { data, error } = await redeemInviteCode(inviteCodeInput)

      if (error) {
        Alert.alert('Грешка', 'Неуспешно активиране на кода за покана.')
        return
      }

      if (!data?.applied) {
        const reason = data?.reason

        if (reason === 'already_referred') {
          Alert.alert('Вече използвано', 'Този профил вече е използвал код за покана.')
          return
        }

        if (reason === 'self_invite') {
          Alert.alert('Невалиден код', 'Не можеш да използваш своя собствен код.')
          return
        }

        if (reason === 'invalid_code') {
          Alert.alert('Невалиден код', 'Този код за покана не съществува.')
          return
        }

        Alert.alert('Няма промяна', 'Кодът не беше приложен.')
        return
      }

      setInviteCodeInput('')
      await refreshProfile()
      await refreshInviteHistoryLocal()
      Alert.alert('Готово', 'Получи 10 точки от поканата.')
    } finally {
      setRedeemingInvite(false)
    }
  }

  async function refreshInviteHistoryLocal() {
    if (!session?.user) return

    try {
      setInviteHistoryLoading(true)

      const { data, error } = await supabase
        .from('friend_invites')
        .select('id, invited_user_id, invited_points, inviter_points, created_at')
        .eq('inviter_user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.log('Refresh invite history error:', error)
        return
      }

      const rows = (data as {
        id: string
        invited_user_id: string
        invited_points: number
        inviter_points: number
        created_at: string
      }[]) || []

      const invitedIds = rows.map((row) => row.invited_user_id)
      const { data: invitedProfiles } = invitedIds.length
        ? await supabase.from('profiles').select('id, display_name, email').in('id', invitedIds)
        : { data: [] }

      const profilesMap = new Map(
        ((invitedProfiles as { id: string; display_name?: string | null; email?: string | null }[]) || []).map(
          (item) => [item.id, item.display_name || item.email || `Потребител ${item.id.slice(0, 6)}`]
        )
      )

      setInviteHistory(
        rows.map((row) => ({
          ...row,
          invited_label: profilesMap.get(row.invited_user_id) || `Потребител ${row.invited_user_id.slice(0, 6)}`,
        }))
      )
    } finally {
      setInviteHistoryLoading(false)
    }
  }

  if (authLoading || profileLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Зареждане на профила...</Text>
      </View>
    )
  }

  if (!session || !profile) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="person-circle-outline" size={28} color="#dbeafe" />
        </View>
        <Text style={styles.title}>Профил</Text>
        <Text style={styles.subtitle}>Влез, за да видиш статистиката си като шофьор.</Text>
        <Text style={styles.emptyText}>Тук ще управляваш акаунта си, паркинг профила, поканите и личния си напредък.</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <TouchableOpacity style={styles.settingsIconButton} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={18} color="#dbeafe" />
        </TouchableOpacity>

        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color="#dbeafe" />
        </View>

        <Text style={styles.heroEyebrow}>Профил на шофьора</Text>

        <View style={styles.titleRow}>
          <Text style={styles.title}>{profile.display_name || session.user.email || 'Шофьор'}</Text>
        </View>

        <Text style={styles.subtitle}>{session.user.email}</Text>

        <View style={styles.rankPill}>
          <Ionicons name="sparkles" size={14} color="#fde68a" />
          <Text style={styles.rankPillText}>{profile.rank}</Text>
        </View>

        <View style={styles.heroMetricsRow}>
          <View style={styles.heroMetricCard}>
            <Text style={styles.heroMetricValue}>{profile.badges.length}</Text>
            <Text style={styles.heroMetricLabel}>Значки</Text>
          </View>
          <View style={styles.heroMetricCard}>
            <Text style={styles.heroMetricValue}>{profile.invite_points_earned ?? 0}</Text>
            <Text style={styles.heroMetricLabel}>Invite т.</Text>
          </View>
          <View style={styles.heroMetricCard}>
            <Text style={styles.heroMetricValue}>{profile.trust_score}</Text>
            <Text style={styles.heroMetricLabel}>Доверие</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Точки" value={profile.points} />
        <StatCard label="Доверие" value={profile.trust_score} />
        <StatCard label="Сигнали" value={profile.reports_count} />
        <StatCard label="Потвърждения" value={profile.confirms_count} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Акаунт</Text>
        <Text style={styles.panelText}>
          Обнови името си в приложението и заяви смяна на имейла за вход. При смяна на имейла ще получиш писмо за потвърждение.
        </Text>

        {pendingEmail ? (
          <View style={styles.infoBanner}>
            <Ionicons name="mail-unread-outline" size={16} color="#dbeafe" />
            <Text style={styles.infoBannerText}>Чака потвърждение за нов имейл: {pendingEmail}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <TextInput
            style={[styles.input, accountErrors.displayName ? styles.inputError : null]}
            placeholder="Име"
            placeholderTextColor="#64748b"
            value={accountDisplayName}
            onChangeText={handleAccountDisplayNameChange}
          />
          {accountErrors.displayName ? <Text style={styles.inputErrorText}>{accountErrors.displayName}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            style={[styles.input, accountErrors.email ? styles.inputError : null]}
            placeholder="Имейл"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType="email-address"
            value={accountEmail}
            onChangeText={handleAccountEmailChange}
          />
          {accountErrors.email ? <Text style={styles.inputErrorText}>{accountErrors.email}</Text> : null}
        </View>

        {accountStatus ? <Text style={styles.successText}>{accountStatus}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, savingAccount && styles.buttonDisabled]}
          onPress={handleSaveAccountDetails}
          disabled={savingAccount}
        >
          <Text style={styles.primaryButtonText}>{savingAccount ? 'Запазване...' : 'Запази акаунт'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Паркинг профил</Text>
        <Text style={styles.panelText}>
          Добави рег. номер и номера за SMS, за да отваряш готово съобщение за синя и зелена зона.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Рег. номер"
          placeholderTextColor="#64748b"
          autoCapitalize="characters"
          value={carPlate}
          onChangeText={setCarPlate}
        />

        <TextInput
          style={styles.input}
          placeholder="SMS номер за синя зона"
          placeholderTextColor="#64748b"
          keyboardType="phone-pad"
          value={blueZoneSmsNumber}
          onChangeText={setBlueZoneSmsNumber}
        />

        <TextInput
          style={styles.input}
          placeholder="SMS номер за зелена зона"
          placeholderTextColor="#64748b"
          keyboardType="phone-pad"
          value={greenZoneSmsNumber}
          onChangeText={setGreenZoneSmsNumber}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleSaveParkingProfile} disabled={savingProfile}>
          <Text style={styles.primaryButtonText}>{savingProfile ? 'Запазване...' : 'Запази паркинг профил'}</Text>
        </TouchableOpacity>

        <View style={styles.zoneButtonsRow}>
          <TouchableOpacity
            style={[styles.zoneButton, !hasParkingProfile && styles.zoneButtonDisabled]}
            onPress={() => handleOpenZoneSms('blue')}
          >
            <Ionicons name="mail-outline" size={16} color="#fff" />
            <Text style={styles.zoneButtonText}>Синя зона</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.zoneButton, styles.greenZoneButton, !hasParkingProfile && styles.zoneButtonDisabled]}
            onPress={() => handleOpenZoneSms('green')}
          >
            <Ionicons name="mail-outline" size={16} color="#fff" />
            <Text style={styles.zoneButtonText}>Зелена зона</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.helperText}>
          Важно: приложението отваря предварително попълнен SMS. Изпращането пак се потвърждава от теб.
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Покани приятел</Text>
        <Text style={styles.panelText}>
          Сподели своя код. Ти получаваш 15 точки, а приятелят ти 10 точки при успешно активиране.
        </Text>

        <View style={styles.inviteCodeCard}>
          <Text style={styles.inviteCodeLabel}>Твоят код</Text>
          <Text style={styles.inviteCodeValue}>{profile.invite_code || '---'}</Text>
          <Text style={styles.helperText}>Точки от покани: {profile.invite_points_earned ?? 0}</Text>
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleShareInvite}>
          <Ionicons name="share-social-outline" size={16} color="#dbeafe" />
          <Text style={styles.secondaryButtonText}>Сподели кода</Text>
        </TouchableOpacity>

        {!profile.referred_by ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Въведи код на приятел"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              value={inviteCodeInput}
              onChangeText={setInviteCodeInput}
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleRedeemInvite} disabled={redeemingInvite}>
              <Text style={styles.primaryButtonText}>{redeemingInvite ? 'Активиране...' : 'Активирай код'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.helperText}>Вече си използвал код за покана на друг потребител.</Text>
        )}

        <View style={styles.inviteHistoryHeader}>
          <Text style={styles.panelTitle}>История на поканите</Text>
          <View style={styles.inviteCountBadge}>
            <Text style={styles.inviteCountBadgeText}>{inviteHistory.length}</Text>
          </View>
        </View>

        {inviteHistoryLoading ? (
          <Text style={styles.helperText}>Зареждане на историята...</Text>
        ) : inviteHistory.length > 0 ? (
          inviteHistory.map((invite) => (
            <View key={invite.id} style={styles.inviteHistoryRow}>
              <View style={styles.inviteHistoryAvatar}>
                <Ionicons name="person-add-outline" size={15} color="#dbeafe" />
              </View>
              <View style={styles.inviteHistoryBody}>
                <Text style={styles.inviteHistoryName}>{invite.invited_label}</Text>
                <Text style={styles.inviteHistoryMeta}>
                  {formatRelativeDate(invite.created_at)} • +{invite.inviter_points} т. за теб • +{invite.invited_points} т. за приятеля
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.inlineEmptyBox}>
            <Ionicons name="people-outline" size={16} color="#7dd3fc" />
            <Text style={styles.helperText}>Още не си поканил приятели. Когато някой използва кода ти, тук ще видиш историята.</Text>
          </View>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Значки</Text>
        {profile.badges.length > 0 ? (
          profile.badges.map((badge) => (
            <View key={badge} style={styles.badgeRow}>
              <Ionicons name="ribbon-outline" size={16} color="#7dd3fc" />
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ))
        ) : (
          <View style={styles.inlineEmptyBox}>
            <Ionicons name="ribbon-outline" size={16} color="#7dd3fc" />
            <Text style={styles.panelText}>Все още няма спечелени значки. Полезните сигнали и честните потвърждения ще отключат първите.</Text>
          </View>
        )}
      </View>

    </ScrollView>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function formatRelativeDate(value?: string) {
  if (!value) return 'току-що'

  const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000))

  if (diffMinutes < 60) return `преди ${diffMinutes} мин`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `преди ${diffHours} ч`

  return `преди ${Math.round(diffHours / 24)} дни`
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08111f',
  },
  content: {
    paddingTop: 64,
    paddingHorizontal: 18,
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#08111f',
    padding: 24,
  },
  loadingText: {
    color: '#dbeafe',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: 'rgba(30,41,59,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 320,
  },
  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 30,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  settingsIconButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: 'rgba(37,99,235,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroEyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 36,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 16,
  },
  rankPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  heroMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    width: '100%',
  },
  heroMetricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  heroMetricValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  heroMetricLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: '#0f172a',
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  panel: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  panelTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  panelText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  infoBanner: {
    marginTop: 14,
    backgroundColor: 'rgba(37,99,235,0.16)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoBannerText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  inputGroup: {
    marginTop: 12,
  },
  input: {
    backgroundColor: '#111c2f',
    color: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputErrorText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },
  successText: {
    color: '#86efac',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 10,
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 14,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#dbeafe',
    fontSize: 14,
    fontWeight: '800',
  },
  zoneButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  zoneButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  greenZoneButton: {
    backgroundColor: '#15803d',
  },
  zoneButtonDisabled: {
    opacity: 0.55,
  },
  zoneButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  helperText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  inlineEmptyBox: {
    marginTop: 10,
    backgroundColor: '#111c2f',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  inviteCodeCard: {
    marginTop: 14,
    backgroundColor: '#111c2f',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  inviteCodeLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  inviteCodeValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 8,
  },
  inviteHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  inviteCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  inviteCountBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  inviteHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  inviteHistoryAvatar: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(37,99,235,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteHistoryBody: {
    flex: 1,
  },
  inviteHistoryName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  inviteHistoryMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  badgeText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
})