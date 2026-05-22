import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useCurrentUser } from '../../hooks/use-current-user'
import { supabase } from '../../supabase'

type RewardEvent = {
  id: string
  event_type: string
  points_delta: number
  created_at: string
}

const RANK_STEPS = [
  { label: 'Нов шофьор', min: 0 },
  { label: 'Наблюдател', min: 25 },
  { label: 'Скаут за паркиране', min: 75 },
  { label: 'Паркинг професионалист', min: 150 },
  { label: 'Градски навигатор', min: 300 },
  { label: 'Легенда на паркирането', min: 600 },
]

function getRankProgressData(points: number) {
  const next = RANK_STEPS.find((step) => step.min > points) ?? null

  if (!next) {
    const last = RANK_STEPS[RANK_STEPS.length - 1]
    return { previous: last.min, next: null, progress: 1, remaining: 0 }
  }

  const nextIndex = RANK_STEPS.findIndex((step) => step.min === next.min)
  const previous = RANK_STEPS[Math.max(0, nextIndex - 1)]
  const range = Math.max(1, next.min - previous.min)

  return {
    previous: previous.min,
    next,
    progress: Math.min(1, Math.max(0, (points - previous.min) / range)),
    remaining: next.min - points,
  }
}

export default function RewardsScreen() {
  const { session, profile, authLoading, profileLoading } = useCurrentUser()
  const [events, setEvents] = useState<RewardEvent[]>([])
  const sessionUserId = session?.user?.id
  const entrance = useRef(new Animated.Value(0)).current
  const heroScale = useRef(new Animated.Value(0.96)).current

  useEffect(() => {
    if (!sessionUserId) return

    let cancelled = false

    async function loadEvents() {
      try {
        const { data, error } = await supabase
          .from('parking_reward_events')
          .select('id, event_type, points_delta, created_at')
          .or(`target_user_id.eq.${sessionUserId},actor_user_id.eq.${sessionUserId}`)
          .order('created_at', { ascending: false })
          .limit(8)

        if (error) {
          console.log('Load reward events error:', error)
          return
        }

        if (!cancelled) {
          setEvents((data as RewardEvent[]) || [])
        }
      } catch (error) {
        console.log('Unexpected reward events error:', error)
      }
    }

    loadEvents()

    return () => {
      cancelled = true
    }
  }, [sessionUserId])

  const nextRank = useMemo(() => {
    return RANK_STEPS.find((step) => step.min > (profile?.points ?? 0)) ?? null
  }, [profile?.points])

  const rankProgress = useMemo(() => getRankProgressData(profile?.points ?? 0), [profile?.points])

  useEffect(() => {
    entrance.setValue(0)
    heroScale.setValue(0.96)

    Animated.parallel([
      Animated.timing(entrance, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(heroScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 8,
      }),
    ]).start()
  }, [entrance, heroScale, sessionUserId])

  function getEntranceStyle(step: number, withScale = false) {
    return {
      opacity: entrance,
      transform: [
        {
          translateY: entrance.interpolate({
            inputRange: [0, 1],
            outputRange: [18 + step * 8, 0],
          }),
        },
        ...(withScale ? [{ scale: heroScale }] : []),
      ],
    }
  }

  if (authLoading || profileLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Зареждане на наградите...</Text>
      </View>
    )
  }

  if (!session || !profile) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="trophy-outline" size={24} color="#fbbf24" />
        </View>
        <Text style={styles.title}>Награди</Text>
        <Text style={styles.subtitle}>Влез, за да отключиш точки, рангове и значки.</Text>
        <Text style={styles.emptyText}>Първият полезен сигнал и първото честно потвърждение ще започнат напредъка ти.</Text>
      </View>
    )
  }

  return (
    <Animated.ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View style={getEntranceStyle(0)}>
        <Text style={styles.eyebrow}>Напредък</Text>
        <Text style={styles.title}>{profile.rank}</Text>
        <Text style={styles.subtitle}>Твоята система за награди при точни сигнали за паркоместа.</Text>
      </Animated.View>

      <Animated.View style={[styles.heroCard, getEntranceStyle(1, true)]}>
        <View style={styles.heroStat}>
          <Ionicons name="trophy" size={18} color="#facc15" />
          <Text style={styles.heroValue}>{profile.points}</Text>
          <Text style={styles.heroLabel}>Точки</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStat}>
          <Ionicons name="shield-checkmark" size={18} color="#22c55e" />
          <Text style={styles.heroValue}>{profile.trust_score}</Text>
          <Text style={styles.heroLabel}>Доверие</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStat}>
          <Ionicons name="ribbon" size={18} color="#38bdf8" />
          <Text style={styles.heroValue}>{profile.badges.length}</Text>
          <Text style={styles.heroLabel}>Значки</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.sectionCard, getEntranceStyle(2)]}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Следващ ранг</Text>
          <Text style={styles.sectionMeta}>{rankProgress.next ? `Още ${rankProgress.remaining} т.` : 'Завършен'}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(12, rankProgress.progress * 100)}%` }]} />
        </View>
        {nextRank ? (
          <Text style={styles.sectionBody}>
            Събери {nextRank.min} точки, за да отключиш {nextRank.label}.
          </Text>
        ) : (
          <Text style={styles.sectionBody}>Вече си на най-високия ранг.</Text>
        )}
      </Animated.View>

      <Animated.View style={[styles.sectionCard, getEntranceStyle(3)]}>
        <Text style={styles.sectionTitle}>Значки</Text>
        <View style={styles.badgesWrap}>
          {profile.badges.length > 0 ? (
            profile.badges.map((badge) => (
              <View key={badge} style={styles.badgeChip}>
                <Ionicons name="ribbon-outline" size={14} color="#08111f" />
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyStateBox}>
              <Ionicons name="ribbon-outline" size={18} color="#f59e0b" />
              <Text style={styles.sectionBody}>Още нямаш значки. Първият полезен сигнал ще отключи една.</Text>
            </View>
          )}
        </View>
      </Animated.View>

      <Animated.View style={[styles.sectionCard, getEntranceStyle(4)]}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Последна активност по наградите</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{events.length}</Text>
          </View>
        </View>
        {events.length > 0 ? (
          events.map((event, index) => (
            <Animated.View key={event.id} style={[styles.eventRow, getEntranceStyle(5 + index)]}>
              <View>
                <Text style={styles.eventTitle}>{formatEventLabel(event.event_type)}</Text>
                <Text style={styles.eventTime}>{formatRelativeDate(event.created_at)}</Text>
              </View>
              <Text style={styles.eventPoints}>{event.points_delta > 0 ? '+' : ''}{event.points_delta}</Text>
            </Animated.View>
          ))
        ) : (
          <View style={styles.emptyStateBox}>
            <Ionicons name="time-outline" size={18} color="#38bdf8" />
            <Text style={styles.sectionBody}>Събитията за награди ще се появят тук след първите ти действия в приложението.</Text>
          </View>
        )}
      </Animated.View>
    </Animated.ScrollView>
  )
}

function formatEventLabel(eventType: string) {
  switch (eventType) {
    case 'report_spot_reward':
      return 'Подаден сигнал за свободно място'
    case 'actor_confirm_reward':
      return 'Потвърдено място'
    case 'actor_taken_reward':
      return 'Затворен остарял сигнал'
    case 'actor_park_reward':
      return 'Успешно паркиране'
    case 'author_confirm_bonus':
      return 'Твой сигнал беше потвърден'
    case 'author_park_bonus':
      return 'Някой паркира на твоето място'
    case 'author_invalid_penalty':
      return 'Наказание за нискокачествен сигнал'
    default:
      return 'Обновяване на награда'
  }
}

function formatRelativeDate(value: string) {
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
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(245,158,11,0.14)',
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
  eyebrow: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 22,
  },
  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 28,
    paddingVertical: 22,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  heroDivider: {
    width: 1,
    height: 42,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  heroLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  sectionMeta: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionBody: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#38bdf8',
  },
  emptyStateBox: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fde68a',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    color: '#08111f',
    fontSize: 12,
    fontWeight: '800',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  eventTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  eventTime: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  eventPoints: {
    color: '#34d399',
    fontSize: 16,
    fontWeight: '900',
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(56,189,248,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
  },
  countBadgeText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '800',
  },
})