import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import * as Linking from 'expo-linking'
import * as Notifications from 'expo-notifications'
import * as Haptics from 'expo-haptics'
import Constants from 'expo-constants'
import { AuthChangeEvent, RealtimePostgresChangesPayload, Session } from '@supabase/supabase-js'
import ParkingMap from '../../components/ParkingMap'
import { HomeAuthScreen } from '../../components/home/home-auth-screen'
import { HomeDashboardIntro } from '../../components/home/home-dashboard-intro'
import { InfoRow, LegendDot } from '../../components/home/home-brand'
import { HomeDiscoverySections } from '../../components/home/home-discovery-sections'
import { useLiveParkingReports } from '../../hooks/use-live-parking-reports'
import { useNearbyReportNotifications } from '../../hooks/use-nearby-report-notifications'
import {
  CLAIM_DURATION_MS,
  CONFIRM_EXTENSION_MS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  EMPTY_AUTH_ERRORS,
  REPORT_DURATION_MS,
  type AuthFieldErrors,
  type AuthMode,
  type FilterType,
  type NotificationPreferences,
  type ParkingReport,
  type Profile,
  type RewardToast,
  type SpotType,
  getAuthCallbackParams,
  getClaimSecondsLeft,
  getConfidence,
  getConfidenceLabel,
  getConfidenceSource,
  getDefaultDisplayName,
  getDistanceMeters,
  getMarkerTitle,
  getMinutesLeft,
  getSpotTypeLabel,
  isClaimActive,
  isReportStale,
} from '../../lib/home-screen'
import {
  getAuthServerFeedback,
  getForgotPasswordValidationErrors,
  getResetPasswordValidationErrors,
  getSignInValidationErrors,
  getSignUpValidationErrors,
  hasAuthErrors,
} from '../../lib/auth-flow'
import {
  buildMapMarkers,
  buildNavigationUrl,
  filterReports,
  filterReportsByDistance,
  rankReports,
  STREET_SEARCH_RADIUS_METERS,
  shouldNotifyForReport,
} from '../../lib/report-feed'
import {
  fetchNotificationPreferences,
  persistNotificationPreferences,
} from '../../lib/notification-preferences-service'
import {
  claimParkingReport,
  confirmParkingReport,
  createParkingReport,
  fetchActiveReports,
  markParkingReportTaken,
} from '../../lib/parking-report-service'
import {
  ensureProfileRecord,
  fetchProfile,
  updateProfileStats,
} from '../../lib/profile-service'
import {
  addPointsToUser,
  penalizeAuthorForInvalidReport,
  rewardReportAuthorOnConfirm,
  rewardReportAuthorOnParkHere,
  type RewardMutationResult,
} from '../../lib/rewards'
import { isExpoGo } from '../../lib/runtime'
import { supabase } from '../../supabase'

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [authErrors, setAuthErrors] = useState<AuthFieldErrors>(EMPTY_AUTH_ERRORS)
  const [authSuccessMessage, setAuthSuccessMessage] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)

  const [profile, setProfile] = useState<Profile | null>(null)

  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null)
  const [region, setRegion] = useState({
    latitude: 43.2141,
    longitude: 27.9147,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  })
  const [reports, setReports] = useState<ParkingReport[]>([])
  const [loadingLocation, setLoadingLocation] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ParkingReport | null>(null)
  const [markingTaken, setMarkingTaken] = useState(false)
  const [claimingSpot, setClaimingSpot] = useState(false)
  const [confirmingSpot, setConfirmingSpot] = useState(false)
  const [typeModalVisible, setTypeModalVisible] = useState(false)
  const [mapModalVisible, setMapModalVisible] = useState(false)
  const [pendingSelectedReport, setPendingSelectedReport] = useState<ParkingReport | null>(null)
  const [selectedMapMarkerId, setSelectedMapMarkerId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [streetSearchCenter, setStreetSearchCenter] = useState<{ latitude: number; longitude: number } | null>(null)
  const [streetSearchLabel, setStreetSearchLabel] = useState('')
  const [streetSearchError, setStreetSearchError] = useState('')
  const [searchResolving, setSearchResolving] = useState(false)
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  )
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(false)
  const [notificationBusy, setNotificationBusy] = useState(false)
  const [rewardToast, setRewardToast] = useState<RewardToast | null>(null)
  const notifiedReportIdsRef = useRef<Set<string>>(new Set())
  const rewardCardScale = useRef(new Animated.Value(1)).current
  const rewardToastOpacity = useRef(new Animated.Value(0)).current
  const rewardToastTranslateY = useRef(new Animated.Value(-16)).current
  const lastKnownPointsRef = useRef<number | null>(null)
  const sessionUserId = session?.user?.id

  const triggerSelectionHaptic = useCallback(() => {
    if (Platform.OS === 'web') return
    void Haptics.selectionAsync().catch(() => undefined)
  }, [])

  const triggerImpactHaptic = useCallback((style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS === 'web') return
    void Haptics.impactAsync(style).catch(() => undefined)
  }, [])

  const triggerNotificationHaptic = useCallback((type: Haptics.NotificationFeedbackType) => {
    if (Platform.OS === 'web') return
    void Haptics.notificationAsync(type).catch(() => undefined)
  }, [])

  function resetAuthForm() {
    setAuthMode('login')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setDisplayName('')
    setAuthErrors(EMPTY_AUTH_ERRORS)
    setAuthSuccessMessage('')
  }

  function clearAuthError(field: keyof AuthFieldErrors) {
    setAuthErrors((current) => {
      if (!current[field]) return current

      return { ...current, [field]: '' }
    })
  }

  function handleDisplayNameChange(value: string) {
    setDisplayName(value)
    clearAuthError('displayName')
    setAuthSuccessMessage('')
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    clearAuthError('email')
    setAuthSuccessMessage('')
  }

  function handlePasswordChange(value: string) {
    setPassword(value)
    clearAuthError('password')
    setAuthSuccessMessage('')
  }

  function handleConfirmPasswordChange(value: string) {
    setConfirmPassword(value)
    clearAuthError('confirmPassword')
    setAuthSuccessMessage('')
  }

  function switchAuthMode(nextMode: AuthMode) {
    setAuthMode(nextMode)
    setAuthErrors(EMPTY_AUTH_ERRORS)
    setAuthSuccessMessage('')

    if (nextMode === 'login' || nextMode === 'forgot_password') {
      setDisplayName('')
    }

    if (nextMode !== 'reset_password') {
      setConfirmPassword('')
    }
  }

  const enterPasswordRecoveryMode = useCallback(() => {
    setAuthMode('reset_password')
    setPassword('')
    setConfirmPassword('')
    setAuthErrors(EMPTY_AUTH_ERRORS)
  }, [])

  const handleIncomingAuthUrl = useCallback(async (url: string | null) => {
    if (!url) return

    const { accessToken, refreshToken, type, code } = getAuthCallbackParams(url)

    try {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          Alert.alert('Грешка', 'Не успяхме да потвърдим линка за възстановяване.')
          return
        }

        if (type === 'recovery') {
          enterPasswordRecoveryMode()
        }

        return
      }

      if (type === 'recovery' && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          Alert.alert('Грешка', 'Линкът за възстановяване е невалиден или е изтекъл.')
          return
        }

        enterPasswordRecoveryMode()
      }
    } catch (error) {
      console.log('Handle auth url error:', error)
      Alert.alert('Грешка', 'Не успяхме да обработим линка за възстановяване.')
    }
  }, [enterPasswordRecoveryMode])

  const handleNearbyReportNotification = useCallback(async (report: ParkingReport) => {
    if (!location || isExpoGo) return

    const distanceMeters = getDistanceMeters(
      location.latitude,
      location.longitude,
      report.latitude,
      report.longitude
    )

    if (
      !shouldNotifyForReport({
        report,
        distanceMeters,
        sessionUserId,
        notificationPreferences,
        notifiedReportIds: notifiedReportIdsRef.current,
      })
    ) {
      return
    }

    notifiedReportIdsRef.current.add(report.id)

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Свободно място наблизо',
        body: `${getSpotTypeLabel(report.spot_type)} • ${Math.round(distanceMeters)} м • шанс ${getConfidence(report)}%`,
        data: { reportId: report.id },
        ...(Platform.OS === 'android' ? { channelId: 'nearby-spots' } : {}),
      },
      trigger: null,
    })
  }, [location, notificationPreferences, sessionUserId])

  const isRealtimeReportActive = useCallback((report: ParkingReport) => {
    return report.status === 'active' && new Date(report.expires_at).getTime() > Date.now()
  }, [])

  const applyRealtimeReport = useCallback((report: ParkingReport) => {
    if (!report.id) return

    if (!isRealtimeReportActive(report)) {
      setReports((prev) => prev.filter((item) => item.id !== report.id))
      setSelectedReport((current) => (current?.id === report.id ? null : current))
      return
    }

    setReports((prev) => {
      const next = prev.filter((item) => item.id !== report.id)
      next.unshift(report)
      next.sort((left, right) => {
        const leftCreatedAt = new Date(left.created_at || left.expires_at).getTime()
        const rightCreatedAt = new Date(right.created_at || right.expires_at).getTime()
        return rightCreatedAt - leftCreatedAt
      })
      return next
    })

    setSelectedReport((current) => (current?.id === report.id ? report : current))
  }, [isRealtimeReportActive])

  const removeRealtimeReport = useCallback((reportId?: string) => {
    if (!reportId) return

    setReports((prev) => prev.filter((item) => item.id !== reportId))
    setSelectedReport((current) => (current?.id === reportId ? null : current))
  }, [])

  const handleRealtimeReportChange = useCallback((payload: RealtimePostgresChangesPayload<ParkingReport>) => {
    if (payload.eventType === 'DELETE') {
      removeRealtimeReport((payload.old as ParkingReport | undefined)?.id)
      return
    }

    applyRealtimeReport(payload.new as ParkingReport)
  }, [applyRealtimeReport, removeRealtimeReport])

  const defaultRegion = useMemo(
    () => ({
      latitude: 43.2141,
      longitude: 27.9147,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }),
    []
  )

  useEffect(() => {
    if (!mapModalVisible && pendingSelectedReport) {
      setSelectedReport(pendingSelectedReport)
      setPendingSelectedReport(null)
    }
  }, [mapModalVisible, pendingSelectedReport])

  useEffect(() => {
    const trimmedQuery = searchQuery.trim()

    if (!trimmedQuery) {
      setSearchResolving(false)
      setStreetSearchCenter(null)
      setStreetSearchLabel('')
      setStreetSearchError('')
      return
    }

    let cancelled = false

    const timeoutId = setTimeout(() => {
      void (async () => {
        try {
          setSearchResolving(true)
          setStreetSearchError('')

          const results = await Location.geocodeAsync(trimmedQuery)

          if (cancelled) return

          const firstResult = results[0]

          if (!firstResult) {
            setStreetSearchCenter(null)
            setStreetSearchLabel('')
            setStreetSearchError('Не намерихме улица с това име.')
            return
          }

          const nextCenter = {
            latitude: firstResult.latitude,
            longitude: firstResult.longitude,
          }

          setStreetSearchCenter(nextCenter)
          setStreetSearchLabel(trimmedQuery)
          setStreetSearchError('')
          setRegion({
            latitude: nextCenter.latitude,
            longitude: nextCenter.longitude,
            latitudeDelta: 0.018,
            longitudeDelta: 0.018,
          })
        } catch (error) {
          if (cancelled) return

          console.log('Street search error:', error)
          setStreetSearchCenter(null)
          setStreetSearchLabel('')
          setStreetSearchError('Проблем при търсене на улицата.')
        } finally {
          if (!cancelled) {
            setSearchResolving(false)
          }
        }
      })()
    }, 450)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [searchQuery])

  useEffect(() => {
    const currentPoints = profile?.points

    if (typeof currentPoints !== 'number') return

    if (lastKnownPointsRef.current === null) {
      lastKnownPointsRef.current = currentPoints
      return
    }

    if (currentPoints === lastKnownPointsRef.current) return

    lastKnownPointsRef.current = currentPoints

    Animated.sequence([
      Animated.spring(rewardCardScale, {
        toValue: 1.04,
        useNativeDriver: true,
        speed: 22,
        bounciness: 10,
      }),
      Animated.spring(rewardCardScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }),
    ]).start()
  }, [profile?.points, rewardCardScale])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, currentSession) => {
      setSession(currentSession ?? null)

      if (event === 'PASSWORD_RECOVERY') {
        enterPasswordRecoveryMode()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [enterPasswordRecoveryMode])

  useEffect(() => {
    let mounted = true

    Linking.getInitialURL().then((url) => {
      if (!mounted) return
      handleIncomingAuthUrl(url)
    })

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingAuthUrl(url)
    })

    return () => {
      mounted = false
      subscription.remove()
    }
  }, [handleIncomingAuthUrl])

  useLiveParkingReports({
    sessionUserId,
    onResetAuthForm: resetAuthForm,
    onSignedOutCleanup: () => {
      setProfile(null)
      setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES)
      setNotificationPermissionGranted(false)
      notifiedReportIdsRef.current.clear()
    },
    onHydrateSignedInState: () => {
      ensureProfile()
      requestLocation()
      loadReports()
      loadMyProfile()

      if (isExpoGo) {
        setNotificationPermissionGranted(false)
        setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES)
        return
      }

      loadNotificationPreferences()
      syncNotificationPermissionStatus()
    },
    onRefreshLiveData: () => {
      loadReports(false)
      loadMyProfile()
    },
    onRealtimeReportChange: handleRealtimeReportChange,
  })

  useNearbyReportNotifications({
    sessionUserId,
    location,
    notificationPreferences,
    notificationPermissionGranted,
    enabled: !isExpoGo,
    onInsertedReport: handleNearbyReportNotification,
  })

  async function ensureProfile() {
    try {
      if (!session?.user) return

      const nextProfile = await ensureProfileRecord({
        userId: session.user.id,
        email: session.user.email ?? null,
        displayName: getDefaultDisplayName(session.user, displayName),
      })

      if (nextProfile) {
        setProfile(nextProfile)
      }
    } catch (error) {
      console.log('Ensure profile error:', error)
    }
  }

  async function loadMyProfile() {
    try {
      if (!session?.user) return

      const nextProfile = await fetchProfile(session.user.id)

      if (nextProfile) setProfile(nextProfile)
    } catch (error) {
      console.log('Unexpected load profile error:', error)
    }
  }

  async function updateMyProfileStats(updates: Partial<Profile>) {
    try {
      if (!session?.user || !profile) return

      const nextProfile = await updateProfileStats({
        userId: session.user.id,
        currentProfile: profile,
        updates,
      })

      if (nextProfile) {
        setProfile(nextProfile)
      }
    } catch (error) {
      console.log('Unexpected update profile error:', error)
    }
  }

  async function signUp() {
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedDisplayName = displayName.trim()
      const nextErrors = getSignUpValidationErrors({
        displayName,
        email,
        password,
      })

      if (hasAuthErrors(nextErrors)) {
        setAuthErrors(nextErrors)
        return
      }

      setAuthErrors(EMPTY_AUTH_ERRORS)

      setAuthSubmitting(true)

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            display_name: normalizedDisplayName,
          },
        },
      })

      if (error) {
        const feedback = getAuthServerFeedback(error.message, 'register')

        if (feedback.kind === 'field_errors') {
          setAuthErrors(feedback.errors)
        } else {
          Alert.alert(feedback.title, feedback.message)
        }

        return
      }

      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setAuthErrors({
          ...EMPTY_AUTH_ERRORS,
          email: 'Вече има акаунт с този имейл.',
        })
        return
      }

      if (data.session) {
        setDisplayName(normalizedDisplayName)
        setAuthSuccessMessage('Акаунтът е създаден и вече си влязъл успешно.')
        return
      }

      setPassword('')
      setAuthMode('login')
      setAuthErrors(EMPTY_AUTH_ERRORS)
      setAuthSuccessMessage('Акаунтът е създаден. Провери имейла си и после влез.')
    } catch (error) {
      console.log('Sign up error:', error)
      Alert.alert('Грешка', 'Неуспешна регистрация.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function signIn() {
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const nextErrors = getSignInValidationErrors({
        email,
        password,
      })

      if (hasAuthErrors(nextErrors)) {
        setAuthErrors(nextErrors)
        return
      }

      setAuthErrors(EMPTY_AUTH_ERRORS)

      setAuthSubmitting(true)

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (error) {
        const feedback = getAuthServerFeedback(error.message, 'login')

        if (feedback.kind === 'field_errors') {
          setAuthErrors(feedback.errors)
        } else {
          Alert.alert(feedback.title, feedback.message)
        }

        return
      }
    } catch (error) {
      console.log('Sign in error:', error)
      Alert.alert('Грешка', 'Неуспешен вход.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function requestPasswordReset() {
    try {
      const normalizedEmail = email.trim().toLowerCase()

      const nextErrors = getForgotPasswordValidationErrors(email)

      if (hasAuthErrors(nextErrors)) {
        setAuthErrors(nextErrors)
        return
      }

      setAuthErrors(EMPTY_AUTH_ERRORS)
      setAuthSubmitting(true)

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: Linking.createURL('/'),
      })

      if (error) {
        const feedback = getAuthServerFeedback(error.message, 'forgot_password')

        if (feedback.kind === 'field_errors') {
          setAuthErrors(feedback.errors)
        } else {
          Alert.alert(feedback.title, feedback.message)
        }

        return
      }

      switchAuthMode('login')
      setAuthSuccessMessage('Изпратихме ти линк за смяна на паролата.')
    } catch (error) {
      console.log('Request password reset error:', error)
      Alert.alert('Грешка', 'Неуспешно изпращане на линк за смяна на паролата.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function resetPassword() {
    try {
      const nextErrors = getResetPasswordValidationErrors({
        password,
        confirmPassword,
      })

      if (hasAuthErrors(nextErrors)) {
        setAuthErrors(nextErrors)
        return
      }

      setAuthErrors(EMPTY_AUTH_ERRORS)
      setAuthSubmitting(true)

      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        const feedback = getAuthServerFeedback(error.message, 'reset_password')

        if (feedback.kind === 'field_errors') {
          setAuthErrors(feedback.errors)
        } else {
          Alert.alert(feedback.title, feedback.message)
        }

        return
      }

      await supabase.auth.signOut()
      setAuthMode('login')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setDisplayName('')
      setAuthErrors(EMPTY_AUTH_ERRORS)
      setAuthSuccessMessage('Паролата е сменена успешно. Влез с новата си парола.')
    } catch (error) {
      console.log('Reset password error:', error)
      Alert.alert('Грешка', 'Неуспешна смяна на паролата.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function requestLocation() {
    try {
      setLoadingLocation(true)

      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== 'granted') {
        Alert.alert('Няма достъп до локация', 'Разреши location permission.')
        setRegion(defaultRegion)
        return
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const coords = currentLocation.coords
      setLocation(coords)
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      })
    } catch (error) {
      console.log('Location error:', error)
      setRegion(defaultRegion)
    } finally {
      setLoadingLocation(false)
    }
  }

  async function syncNotificationPermissionStatus() {
    try {
      if (Platform.OS === 'web' || isExpoGo) {
        setNotificationPermissionGranted(false)
        return
      }

      const settings = await Notifications.getPermissionsAsync()
      setNotificationPermissionGranted(
        settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
      )
    } catch (error) {
      console.log('Notification permission status error:', error)
      setNotificationPermissionGranted(false)
    }
  }

  async function loadNotificationPreferences() {
    try {
      if (isExpoGo) {
        setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES)
        return
      }

      if (!session?.user) return

      const nextPreferences = await fetchNotificationPreferences(session.user.id)

      if (nextPreferences) {
        setNotificationPreferences(nextPreferences)
      }
    } catch (error) {
      console.log('Unexpected load notification preferences error:', error)
    }
  }

  async function saveNotificationPreferences(nextPreferences: NotificationPreferences) {
    try {
      if (!session?.user) return

      const saved = await persistNotificationPreferences(session.user.id, nextPreferences)

      if (!saved) {
        console.log('Save notification preferences error')
      }
    } catch (error) {
      console.log('Unexpected save notification preferences error:', error)
    }
  }

  async function requestNotificationPermission() {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Няма поддръжка', 'Известията работят само на мобилно устройство.')
        return false
      }

      if (isExpoGo) {
        Alert.alert(
          'Ограничение в Expo Go',
          'Тази версия работи в Expo Go, но nearby notifications са изключени. Останалата част от приложението може да се ползва нормално.'
        )
        return false
      }

      const existing = await Notifications.getPermissionsAsync()

      if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
        setNotificationPermissionGranted(true)
        return true
      }

      const requested = await Notifications.requestPermissionsAsync()
      const granted =
        requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL

      setNotificationPermissionGranted(granted)
      return granted
    } catch (error) {
      console.log('Request notification permission error:', error)
      setNotificationPermissionGranted(false)
      return false
    }
  }

  async function toggleNearbyNotifications() {
    try {
      setNotificationBusy(true)

      if (notificationPreferences.enabled) {
        const nextPreferences = { ...notificationPreferences, enabled: false }
        setNotificationPreferences(nextPreferences)
        await saveNotificationPreferences(nextPreferences)
        Alert.alert('Изключено', 'Няма да получаваш известия за нови места наблизо.')
        return
      }

      const permissionGranted = await requestNotificationPermission()

      if (!permissionGranted) {
        Alert.alert('Без разрешение', 'Разреши notifications, за да получаваш известия за места наблизо.')
        return
      }

      const nextPreferences = { ...notificationPreferences, enabled: true }
      setNotificationPreferences(nextPreferences)
      await saveNotificationPreferences(nextPreferences)
      Alert.alert('Готово', 'Ще получаваш известия за нови свободни места наблизо.')
    } finally {
      setNotificationBusy(false)
    }
  }

  function showRewardToastMessage(title: string, detail: string) {
    triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success)
    setRewardToast({ title, detail })
    rewardToastOpacity.setValue(0)
    rewardToastTranslateY.setValue(-16)

    Animated.sequence([
      Animated.parallel([
        Animated.timing(rewardToastOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rewardToastTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(2200),
      Animated.parallel([
        Animated.timing(rewardToastOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rewardToastTranslateY, {
          toValue: -10,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) setRewardToast(null)
    })
  }

  function applyRewardResult(result: RewardMutationResult, rewardLabel: string) {
    if (!result.applied || !result.profile || result.profile.id !== sessionUserId) return

    setProfile((currentProfile) => {
      if (!currentProfile) return result.profile as Profile
      return {
        ...currentProfile,
        ...result.profile,
      }
    })

    const unlockedBadgeText = result.unlockedBadges.length
      ? `Нова значка: ${result.unlockedBadges[0]}`
      : `Ранг: ${result.profile.rank}`

    showRewardToastMessage(rewardLabel, unlockedBadgeText)
  }

  async function loadReports(showRefreshLoader = false) {
    try {
      if (showRefreshLoader) setRefreshing(true)

      const nextReports = await fetchActiveReports()

      if (!nextReports) {
        console.log('Load reports error')
        return
      }

      setReports(nextReports)
    } catch (error) {
      console.log('Unexpected load error:', error)
    } finally {
      if (showRefreshLoader) setRefreshing(false)
    }
  }

  async function reportFreeSpot(spotType: SpotType) {
    try {
      if (!location || !session?.user) {
        Alert.alert('Няма локация', 'Изчакай да се зареди текущата ти локация.')
        return
      }

      setSubmitting(true)

      const insertedReport = await createParkingReport({
        userId: session.user.id,
        latitude: location.latitude,
        longitude: location.longitude,
        spotType,
        reportDurationMs: REPORT_DURATION_MS,
      })

      if (!insertedReport) {
        console.log('Insert error')
        Alert.alert('Грешка', 'Неуспешно добавяне на паркомясто.')
        return
      }

      setTypeModalVisible(false)
      triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success)

      if (profile) {
        await updateMyProfileStats({
          reports_count: profile.reports_count + 1,
        })
      }

      if (insertedReport?.id) {
        const rewardResult = await addPointsToUser({
          reportId: insertedReport.id,
          targetUserId: session.user.id,
          eventType: 'report_spot_reward',
          pointsDelta: 1,
          trustDelta: 1,
          metadata: { spot_type: spotType },
        })

        applyRewardResult(rewardResult, '+1 точка за нов сигнал')
      }

      Alert.alert('Готово', 'Маркира паркомясто за 3 минути.')
      loadReports(false)
    } catch (error) {
      console.log('Unexpected insert error:', error)
      Alert.alert('Грешка', 'Възникна проблем.')
    } finally {
      setSubmitting(false)
    }
  }

  async function claimSpot() {
    try {
      if (!selectedReport || !session?.user) return

      if (isClaimActive(selectedReport) && selectedReport.claimed_by !== session.user.id) {
        Alert.alert('Зает интерес', 'Някой вече се насочва към това място.')
        return
      }

      setClaimingSpot(true)

      const claimState = await claimParkingReport({
        reportId: selectedReport.id,
        userId: session.user.id,
        claimDurationMs: CLAIM_DURATION_MS,
      })

      if (!claimState) {
        console.log('Claim error')
        Alert.alert('Грешка', 'Неуспешно заявяване.')
        return
      }

      const updatedReport = {
        ...selectedReport,
        ...claimState,
      }

      setReports((prev) =>
        prev.map((item) => (item.id === selectedReport.id ? updatedReport : item))
      )
      setSelectedReport(updatedReport)
      triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success)

      Alert.alert('Готово', 'Другите виждат, че се насочваш към мястото.')
    } catch (error) {
      console.log('Unexpected claim error:', error)
      Alert.alert('Грешка', 'Възникна проблем.')
    } finally {
      setClaimingSpot(false)
    }
  }

  async function confirmStillFree() {
    try {
      if (!selectedReport || !session?.user) return

      setConfirmingSpot(true)

      const confirmState = await confirmParkingReport({
        reportId: selectedReport.id,
        currentConfirmCount: selectedReport.confirm_count || 0,
        extensionMs: CONFIRM_EXTENSION_MS,
      })

      if (!confirmState) {
        console.log('Confirm free error')
        Alert.alert('Грешка', 'Неуспешно потвърждение.')
        return
      }

      const updatedReport = {
        ...selectedReport,
        ...confirmState,
      }

      setReports((prev) =>
        prev.map((item) => (item.id === selectedReport.id ? updatedReport : item))
      )
      setSelectedReport(updatedReport)
      triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success)

      if (profile) {
        await updateMyProfileStats({
          confirms_count: profile.confirms_count + 1,
        })
      }

      if (selectedReport.report_user_id !== session.user.id) {
        const actorReward = await addPointsToUser({
          reportId: selectedReport.id,
          targetUserId: session.user.id,
          eventType: 'actor_confirm_reward',
          pointsDelta: 4,
          trustDelta: 3,
          metadata: { source: 'confirm_still_free' },
        })

        applyRewardResult(actorReward, '+4 точки за потвърждение')
        await rewardReportAuthorOnConfirm(updatedReport, session.user.id)
      }

      Alert.alert('Готово', 'Мястото е потвърдено като свободно.')
    } catch (error) {
      console.log('Unexpected confirm free error:', error)
      Alert.alert('Грешка', 'Възникна проблем.')
    } finally {
      setConfirmingSpot(false)
    }
  }

  async function markSpotAsTaken() {
    try {
      if (!selectedReport || !session?.user) return

      setMarkingTaken(true)
      const reportBeforeUpdate = selectedReport

      const updateState = await markParkingReportTaken({
        reportId: reportBeforeUpdate.id,
        currentTakenCount: reportBeforeUpdate.taken_count || 0,
        clearClaim: false,
      })

      if (!updateState) {
        console.log('Update error')
        Alert.alert('Грешка', 'Неуспешно маркиране.')
        return
      }

      setReports((prev) => prev.filter((item) => item.id !== selectedReport.id))
      setSelectedReport(null)
      triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success)

      if (profile) {
        await updateMyProfileStats({
          taken_marks_count: profile.taken_marks_count + 1,
        })
      }

      if (reportBeforeUpdate.report_user_id !== session.user.id) {
        const actorReward = await addPointsToUser({
          reportId: reportBeforeUpdate.id,
          targetUserId: session.user.id,
          eventType: 'actor_taken_reward',
          pointsDelta: 3,
          trustDelta: 2,
          metadata: { source: 'mark_taken' },
        })

        applyRewardResult(actorReward, '+3 точки за точен сигнал')
        await penalizeAuthorForInvalidReport(reportBeforeUpdate, session.user.id)
      }

      Alert.alert('Готово', 'Мястото беше маркирано като заето.')
    } catch (error) {
      console.log('Unexpected update error:', error)
      Alert.alert('Грешка', 'Възникна проблем.')
    } finally {
      setMarkingTaken(false)
    }
  }

  async function parkHere() {
    try {
      if (!selectedReport || !session?.user) return

      setMarkingTaken(true)
      const reportBeforeUpdate = selectedReport

      const updateState = await markParkingReportTaken({
        reportId: reportBeforeUpdate.id,
        currentTakenCount: reportBeforeUpdate.taken_count || 0,
        clearClaim: true,
      })

      if (!updateState) {
        console.log('Park here error')
        Alert.alert('Грешка', 'Неуспешно маркиране като паркирано.')
        return
      }

      setReports((prev) => prev.filter((item) => item.id !== selectedReport.id))
      setSelectedReport(null)
      triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success)

      if (profile) {
        await updateMyProfileStats({
          taken_marks_count: profile.taken_marks_count + 1,
        })
      }

      if (reportBeforeUpdate.report_user_id !== session.user.id) {
        const actorReward = await addPointsToUser({
          reportId: reportBeforeUpdate.id,
          targetUserId: session.user.id,
          eventType: 'actor_park_reward',
          pointsDelta: 6,
          trustDelta: 4,
          metadata: { source: 'park_here' },
        })

        applyRewardResult(actorReward, '+6 точки за паркиране')
        await rewardReportAuthorOnParkHere(reportBeforeUpdate, session.user.id)
      }

      Alert.alert('Готово', 'Маркира, че си паркирал тук.')
    } catch (error) {
      console.log('Unexpected park here error:', error)
      Alert.alert('Грешка', 'Възникна проблем.')
    } finally {
      setMarkingTaken(false)
    }
  }

  async function navigateToSpot() {
    try {
      if (!selectedReport) return

      const url = buildNavigationUrl({
        report: selectedReport,
        location,
        platformOS: Platform.OS,
      })

      await Linking.openURL(url)
    } catch (error) {
      console.log('Navigation error:', error)
      Alert.alert('Грешка', 'Проблем при отваряне на навигацията.')
    }
  }

  const textFilteredReports = filterReports({
    reports,
    filter,
    searchQuery: streetSearchCenter ? '' : searchQuery,
  })

  const filteredReports = filterReportsByDistance({
    reports: textFilteredReports,
    center: streetSearchCenter,
    radiusMeters: STREET_SEARCH_RADIUS_METERS,
  })

  const mapMarkers = buildMapMarkers(filteredReports)

  const rankingOrigin = streetSearchCenter || location
  const rankedReports = rankReports(filteredReports, rankingOrigin)

  const recommendedReport = rankedReports[0] || null
  const nearbyReports = rankedReports.slice(0, 6)
  const visibleBadges = (profile?.badges || []).slice(0, 5)
  const hasGoogleMapsApiKey = Boolean(Constants.expoConfig?.extra?.hasGoogleMapsApiKey)
  const dashboardSubtext = recommendedReport
    ? 'Започни с препоръката или отвори картата на живо.'
    : 'Прегледай картата или докладвай място от главния екран.'
  const profileLabel = profile?.display_name || profile?.email || 'Потребител'
  const locationLabel = loadingLocation
    ? 'Локализиране...'
    : streetSearchCenter
    ? `Радиус ${Math.round(STREET_SEARCH_RADIUS_METERS / 100) / 10} км около търсената улица`
    : 'Използва твоята локация'
  const streetSearchSummary = streetSearchCenter
    ? `Показваме места до ${Math.round(STREET_SEARCH_RADIUS_METERS)} м около „${streetSearchLabel}“.`
    : 'Търси улица, за да видиш места около нея.'
  const distanceLabel = streetSearchCenter ? 'от търсената улица' : 'разстояние'

  if (authLoading) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.authTitle}>Зареждане...</Text>
      </View>
    )
  }

  if (!session || authMode === 'reset_password') {
    return (
      <HomeAuthScreen
        authMode={authMode}
        authErrors={authErrors}
        authSuccessMessage={authSuccessMessage}
        authSubmitting={authSubmitting}
        email={email}
        password={password}
        confirmPassword={confirmPassword}
        displayName={displayName}
        onSwitchMode={switchAuthMode}
        onDisplayNameChange={handleDisplayNameChange}
        onEmailChange={handleEmailChange}
        onPasswordChange={handlePasswordChange}
        onConfirmPasswordChange={handleConfirmPasswordChange}
        onSubmit={
          authMode === 'login'
            ? signIn
            : authMode === 'register'
            ? signUp
            : authMode === 'forgot_password'
            ? requestPasswordReset
            : resetPassword
        }
      />
    )
  }

  function openMapModal() {
    if (Platform.OS === 'android' && !hasGoogleMapsApiKey) {
      Alert.alert(
        'Картата още не е конфигурирана',
        'Android build-ът няма Google Maps API key. Добави GOOGLE_MAPS_API_KEY в EAS, преизгради APK и опитай отново.'
      )
      return
    }

    triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light)
    setSelectedMapMarkerId(selectedReport?.id ?? recommendedReport?.id ?? null)
    setMapModalVisible(true)
  }

  return (
    <View style={styles.container}>
      <View style={styles.dashboardBackgroundGlowTop} />
      <View style={styles.dashboardBackgroundGlowBottom} />

      {rewardToast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.rewardToast,
            {
              opacity: rewardToastOpacity,
              transform: [{ translateY: rewardToastTranslateY }],
            },
          ]}
        >
          <Text style={styles.rewardToastTitle}>{rewardToast.title}</Text>
          <Text style={styles.rewardToastDetail}>{rewardToast.detail}</Text>
        </Animated.View>
      )}

      <ScrollView
        style={styles.dashboardScroll}
        contentContainerStyle={styles.dashboardContent}
        showsVerticalScrollIndicator={false}
      >
        <HomeDashboardIntro
          loadingLocation={loadingLocation}
          dashboardSubtext={dashboardSubtext}
          profileLabel={profileLabel}
          trustScore={profile?.trust_score ?? 0}
          locationLabel={locationLabel}
          notificationEnabled={notificationPreferences.enabled}
          notificationBusy={notificationBusy}
          refreshing={refreshing}
          filter={filter}
          filteredReportsCount={filteredReports.length}
          onToggleNotifications={toggleNearbyNotifications}
          onRefresh={() => loadReports(true)}
          onFilterChange={setFilter}
          onOpenMap={openMapModal}
        />

        <HomeDiscoverySections
          recommendedReport={recommendedReport}
          nearbyReports={nearbyReports}
          distanceOrigin={rankingOrigin}
          distanceLabel={distanceLabel}
          onOpenMap={openMapModal}
          onSelectReport={setSelectedReport}
          onNavigateToRecommended={() => {
            if (!recommendedReport) return

            setSelectedReport(recommendedReport)
            navigateToSpot()
          }}
        />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium)
          setTypeModalVisible(true)
        }}
      >
        <Text style={styles.fabPlus}>＋</Text>
        <Text style={styles.fabText}>Освободих място</Text>
      </TouchableOpacity>

      <Modal
        visible={mapModalVisible}
        animationType="slide"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={styles.mapModalScreen}>
          <ParkingMap
            region={region}
            markers={mapMarkers}
            selectedMarkerId={selectedMapMarkerId}
            onSelectMarker={(reportId: string) => {
              triggerSelectionHaptic()
              setSelectedMapMarkerId(reportId)
              const selected = filteredReports.find((report) => report.id === reportId)
              if (selected) {
                setPendingSelectedReport(selected)
                setMapModalVisible(false)
              }
            }}
          />

          <View style={styles.mapModalHeaderCard}>
            <View style={styles.mapModalHeaderRow}>
              <View>
                <Text style={styles.mapModalTitle}>Карта на живо</Text>
                <Text style={styles.mapModalSubtitle}>{filteredReports.length} активни сигнала</Text>
              </View>
              <TouchableOpacity
                style={styles.dashboardIconButton}
                onPress={() => {
                  triggerSelectionHaptic()
                  setSelectedMapMarkerId(null)
                  setMapModalVisible(false)
                }}
              >
                <Ionicons name="close" size={20} color="#dbeafe" />
              </TouchableOpacity>
            </View>

            <View style={styles.mapSearchWrapper}>
              <Ionicons name="search" size={18} color="#64748b" style={styles.mapSearchIcon} />
              <TextInput
                style={styles.mapSearchInput}
                placeholder="Въведи улица или адрес"
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {searchQuery.trim() ? (
              <View style={styles.mapSearchFeedbackRow}>
                <Ionicons
                  name={searchResolving ? 'hourglass-outline' : streetSearchError ? 'alert-circle-outline' : 'navigate-outline'}
                  size={14}
                  color={streetSearchError ? '#fca5a5' : '#94a3b8'}
                />
                <Text style={[styles.mapSearchFeedbackText, streetSearchError ? styles.mapSearchFeedbackTextError : null]}>
                  {searchResolving ? 'Търся улицата...' : streetSearchError || streetSearchSummary}
                </Text>
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapLegendRow}>
              <LegendDot color="teal" label="Безплатно" />
              <LegendDot color="blue" label="Синя зона" />
              <LegendDot color="forestgreen" label="Зелена зона" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={typeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Избери тип паркомясто</Text>
            <Text style={styles.modalSubtext}>
              Ще използваме текущата ти GPS локация.
            </Text>

            <TouchableOpacity
              style={[styles.optionButton, styles.freeButton]}
              onPress={() => {
                triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium)
                reportFreeSpot('free')
              }}
              disabled={submitting}
            >
              <Text style={styles.optionButtonText}>Безплатно</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.blueButton]}
              onPress={() => {
                triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium)
                reportFreeSpot('blue_zone')
              }}
              disabled={submitting}
            >
              <Text style={styles.optionButtonText}>Синя зона</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.paidButton]}
              onPress={() => {
                triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium)
                reportFreeSpot('paid')
              }}
              disabled={submitting}
            >
              <Text style={styles.optionButtonText}>Зелена зона</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                triggerSelectionHaptic()
                setTypeModalVisible(false)
              }}
            >
              <Text style={styles.closeButtonText}>Затвори</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedReport}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Информация за мястото</Text>

            <View style={styles.infoCard}>
              <InfoRow label="Тип" value={selectedReport ? getSpotTypeLabel(selectedReport.spot_type) : '-'} />
              <InfoRow label="Оставащи минути" value={String(selectedReport ? getMinutesLeft(selectedReport.expires_at) : 0)} />
              <InfoRow
                label="Шанс"
                value={
                  selectedReport
                    ? `${getConfidence(selectedReport)}% (${getConfidenceLabel(getConfidence(selectedReport))})`
                    : '0%'
                }
              />
              <InfoRow
                label="Източник"
                value={selectedReport ? (getConfidenceSource(selectedReport) === 'ai' ? 'AI модел' : 'Базова логика') : '-'}
              />
              <InfoRow label="Потвърждения" value={String(selectedReport?.confirm_count || 0)} />
              {!!selectedReport?.ai_confidence_reason && (
                <Text style={styles.aiReasonText}>{selectedReport.ai_confidence_reason}</Text>
              )}
              <InfoRow
                label="Статус"
                value={
                  selectedReport && isClaimActive(selectedReport)
                    ? `Някой се насочва (${getClaimSecondsLeft(selectedReport.claim_expires_at)} сек.)`
                    : selectedReport && isReportStale(selectedReport)
                    ? 'Остарял сигнал'
                    : 'Свободно'
                }
              />
            </View>

            <TouchableOpacity
              style={styles.navigateButton}
              onPress={() => {
                triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light)
                navigateToSpot()
              }}
            >
              <Text style={styles.navigateButtonText}>Навигирай до мястото</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.claimButton, claimingSpot && styles.buttonDisabled]}
              onPress={() => {
                triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium)
                claimSpot()
              }}
              disabled={claimingSpot}
            >
              <Text style={styles.claimButtonText}>
                {claimingSpot ? 'Заявяване...' : 'Отивам натам'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, confirmingSpot && styles.buttonDisabled]}
              onPress={() => {
                triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium)
                confirmStillFree()
              }}
              disabled={confirmingSpot}
            >
              <Text style={styles.confirmButtonText}>
                {confirmingSpot ? 'Потвърждение...' : 'Още е свободно'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.parkButton, markingTaken && styles.buttonDisabled]}
              onPress={() => {
                triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Heavy)
                parkHere()
              }}
              disabled={markingTaken}
            >
              <Text style={styles.parkButtonText}>
                {markingTaken ? 'Маркиране...' : 'Паркирах тук'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.takenButton, markingTaken && styles.buttonDisabled]}
              onPress={() => {
                triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Heavy)
                markSpotAsTaken()
              }}
              disabled={markingTaken}
            >
              <Text style={styles.takenButtonText}>
                {markingTaken ? 'Маркиране...' : 'Вече е заето'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                triggerSelectionHaptic()
                setSelectedReport(null)
              }}
            >
              <Text style={styles.closeButtonText}>Затвори</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08111f',
  },
  dashboardBackgroundGlowTop: {
    position: 'absolute',
    top: 40,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(34,193,255,0.12)',
  },
  dashboardBackgroundGlowBottom: {
    position: 'absolute',
    right: -30,
    bottom: 120,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: 'rgba(141,233,59,0.10)',
  },
  dashboardScroll: {
    flex: 1,
  },
  rewardToast: {
    position: 'absolute',
    top: 54,
    right: 16,
    left: 16,
    zIndex: 30,
    backgroundColor: 'rgba(15,23,42,0.96)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.42)',
  },
  rewardToastTitle: {
    color: '#fef3c7',
    fontSize: 14,
    fontWeight: '800',
  },
  rewardToastDetail: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  dashboardContent: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 220,
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dashboardSubtext: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  dashboardIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 18,
  },
  trustPillDashboard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(37,99,235,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: '66%',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  locationPillText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  rewardsCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.18)',
  },
  rewardsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rewardsEyebrow: {
    color: '#c2410c',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  rewardsRank: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pointsBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  rewardsMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 16,
  },
  rewardsMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  rewardsMetricValue: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
  },
  rewardsMetricLabel: {
    color: '#7c2d12',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  rewardsMetricDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(124,45,18,0.16)',
  },
  badgesRow: {
    gap: 8,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fed7aa',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeChipText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
  badgeChipEmpty: {
    backgroundColor: '#ffedd5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  badgeChipEmptyText: {
    color: '#9a3412',
    fontSize: 12,
    fontWeight: '700',
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: 17,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: '#ecfeff',
    color: '#0f172a',
    borderRadius: 18,
    paddingLeft: 42,
    paddingRight: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  chipsRow: {
    paddingBottom: 8,
    gap: 8,
  },
  homeFilterChip: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  homeFilterChipActive: {
    backgroundColor: '#2563eb',
  },
  homeFilterChipText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  homeFilterChipTextActive: {
    color: '#fff',
  },
  mapCtaCard: {
    marginTop: 6,
    marginBottom: 16,
    backgroundColor: '#101828',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapCtaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(110,231,183,0.12)',
    marginRight: 14,
  },
  mapCtaTextWrap: {
    flex: 1,
  },
  mapCtaTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  mapCtaSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  recommendationCard: {
    backgroundColor: '#ecfeff',
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
  },
  recommendationEmptyCard: {
    backgroundColor: '#ecfeff',
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
  },
  recommendationEmptyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,118,110,0.12)',
    marginBottom: 14,
  },
  recommendationEmptyTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  recommendationEmptyText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    fontWeight: '600',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionEyebrow: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  recommendationTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
    maxWidth: 230,
  },
  recommendationBadge: {
    backgroundColor: '#0f766e',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  recommendationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  recommendationMeta: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    fontWeight: '600',
  },
  recommendationActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  recommendationPrimaryButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationPrimaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  recommendationSecondaryButton: {
    width: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f766e',
  },
  statsCardDashboard: {
    backgroundColor: 'rgba(10,16,28,0.88)',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionLink: {
    color: '#7dd3fc',
    fontSize: 13,
    fontWeight: '800',
  },
  spotList: {
    gap: 10,
  },
  spotCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  spotDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 5,
  },
  spotCardBody: {
    flex: 1,
  },
  spotCardTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  spotCardMeta: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  spotCardSubmeta: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  spotEmptyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'flex-start',
    gap: 8,
  },
  spotEmptyTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  spotEmptyText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  centeredScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#08111f',
  },
  authScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#08111f',
  },
  authGlow: {
    position: 'absolute',
    top: 120,
    left: 40,
    right: 40,
    height: 220,
    backgroundColor: 'rgba(37,99,235,0.18)',
    borderRadius: 999,
  },
  authCard: {
    backgroundColor: 'rgba(15,23,42,0.96)',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  authModeSwitchRow: {
    flexDirection: 'row',
    backgroundColor: '#0b1324',
    borderRadius: 18,
    padding: 4,
    marginBottom: 18,
    gap: 6,
  },
  authModeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
  },
  authModeChipActive: {
    backgroundColor: '#2563eb',
  },
  authModeChipText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '800',
  },
  authModeChipTextActive: {
    color: '#fff',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logoWrapCompact: {
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  logoMarkFrame: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 6,
  },
  logoPinTail: {
    position: 'absolute',
    backgroundColor: '#0f172a',
    transform: [{ rotate: '45deg' }],
    opacity: 0.96,
  },
  logoMark: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  logoGradientLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '54%',
    backgroundColor: '#22c1ff',
    opacity: 0.92,
  },
  logoGradientRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '54%',
    backgroundColor: '#8de93b',
    opacity: 0.9,
  },
  logoRing: {
    position: 'absolute',
    borderColor: '#f8fafc',
    backgroundColor: 'rgba(15,23,42,0.78)',
  },
  logoRingInner: {
    backgroundColor: 'rgba(15,23,42,0.88)',
  },
  logoCenterDot: {
    backgroundColor: '#d9ff57',
    borderWidth: 2,
    borderColor: '#0f172a',
    zIndex: 2,
  },
  logoSweep: {
    position: 'absolute',
    backgroundColor: '#f8fafc',
    transform: [{ rotate: '-35deg' }],
    zIndex: 3,
  },
  logoWordmark: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoWordmarkPark: {
    color: '#38bdf8',
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  logoWordmarkRadar: {
    color: '#8de93b',
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  authTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  authSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#111c2f',
    color: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputErrorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },
  authButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  authSuccessBanner: {
    marginBottom: 14,
    backgroundColor: 'rgba(20,83,45,0.38)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(134,239,172,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authSuccessBannerText: {
    color: '#dcfce7',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    flex: 1,
  },
  helperAuthText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 4,
  },
  secondaryAuthText: {
    marginTop: 14,
    color: '#dbeafe',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  switchAuthText: {
    marginTop: 16,
    color: '#93c5fd',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  headerCard: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(10,16,28,0.86)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#a5b4fc',
    fontSize: 13,
    marginTop: 3,
    fontWeight: '600',
  },
  refreshIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIconButtonActive: {
    backgroundColor: '#2563eb',
  },
  refreshIconText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  trustPill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(37,99,235,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  trustPillText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '700',
  },
  mapModalScreen: {
    flex: 1,
    backgroundColor: '#08111f',
  },
  mapModalHeaderCard: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(10,16,28,0.88)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mapSearchWrapper: {
    position: 'relative',
    marginTop: 14,
  },
  mapSearchIcon: {
    position: 'absolute',
    left: 14,
    top: 17,
    zIndex: 1,
  },
  mapSearchInput: {
    backgroundColor: '#ecfeff',
    color: '#0f172a',
    borderRadius: 18,
    paddingLeft: 42,
    paddingRight: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  mapSearchFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  mapSearchFeedbackText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  mapSearchFeedbackTextError: {
    color: '#fca5a5',
  },
  mapModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  mapModalSubtitle: {
    color: '#a5b4fc',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  mapLegendRow: {
    gap: 8,
    marginTop: 14,
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topControlsRow: {
    position: 'absolute',
    top: 240,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  legendCard: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 18,
    padding: 12,
    gap: 8,
    minWidth: 150,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 8,
  },
  legendText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  statsCard: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(10,16,28,0.88)',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  fab: {
    position: 'absolute',
    bottom: 108,
    left: 16,
    right: 86,
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 20,
  },
  fabPlus: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 26,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 18,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  aiReasonText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  infoLabel: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
    maxWidth: '56%',
    textAlign: 'right',
  },
  optionButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  freeButton: {
    backgroundColor: '#0f766e',
  },
  blueButton: {
    backgroundColor: '#2563eb',
  },
  paidButton: {
    backgroundColor: '#15803d',
  },
  optionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  navigateButton: {
    backgroundColor: '#0f766e',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  claimButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  confirmButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  parkButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  parkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  takenButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  takenButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  closeButton: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
})