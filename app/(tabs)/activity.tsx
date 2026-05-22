import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useCurrentUser } from '../../hooks/use-current-user'
import { supabase } from '../../supabase'

type ParkingReportActivity = {
  id: string
  status: string
  created_at?: string
  confirm_count?: number
  taken_count?: number
  spot_type?: string
  successful_validation_count?: number
}

export default function ActivityScreen() {
  const { session, authLoading } = useCurrentUser()
  const [reports, setReports] = useState<ParkingReportActivity[]>([])
  const sessionUserId = session?.user?.id

  useEffect(() => {
    if (!sessionUserId) return

    let cancelled = false

    async function loadActivity() {
      try {
        const { data, error } = await supabase
          .from('parking_reports')
          .select('id, status, created_at, confirm_count, taken_count, spot_type, successful_validation_count')
          .eq('report_user_id', sessionUserId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          console.log('Load activity reports error:', error)
          return
        }

        if (!cancelled) {
          setReports((data as ParkingReportActivity[]) || [])
        }
      } catch (error) {
        console.log('Unexpected activity reports error:', error)
      }
    }

    loadActivity()

    return () => {
      cancelled = true
    }
  }, [sessionUserId])

  const totals = useMemo(() => {
    return reports.reduce(
      (accumulator, report) => {
        accumulator.confirmations += report.confirm_count || 0
        accumulator.taken += report.taken_count || 0
        accumulator.successful += report.successful_validation_count || 0
        return accumulator
      },
      { confirmations: 0, taken: 0, successful: 0 }
    )
  }, [reports])

  if (authLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Зареждане на активността...</Text>
      </View>
    )
  }

  if (!session) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="pulse-outline" size={24} color="#7dd3fc" />
        </View>
        <Text style={styles.title}>Активност</Text>
        <Text style={styles.subtitle}>Влез, за да видиш своята времева линия за паркиране.</Text>
        <Text style={styles.emptyText}>Тук ще следиш как се представят твоите сигнали и колко често помагаш на други шофьори.</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>Хронология</Text>
      <Text style={styles.title}>Твоята активност</Text>
      <Text style={styles.subtitle}>Ясна хронология как са се представили твоите сигнали за паркиране.</Text>

      <View style={styles.heroCard}>
        <View style={styles.heroStatBlock}>
          <Text style={styles.heroStatLabel}>Сигнали</Text>
          <Text style={styles.heroStatValue}>{reports.length}</Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStatBlock}>
          <Text style={styles.heroStatLabel}>Последен статус</Text>
          <Text style={styles.heroStatValueSmall}>{reports[0]?.status === 'taken' ? 'Заето' : reports[0] ? 'Активно' : 'Няма'}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <SummaryCard icon="checkmark-done" label="Потвърждения" value={totals.confirmations} />
        <SummaryCard icon="car-sport" label="Успешни" value={totals.successful} />
        <SummaryCard icon="close-circle" label="Заети" value={totals.taken} />
      </View>

      <View style={styles.feedCard}>
        <View style={styles.feedHeader}>
          <Text style={styles.feedTitle}>Последни сигнали</Text>
          <View style={styles.feedCountBadge}>
            <Text style={styles.feedCountBadgeText}>{reports.length}</Text>
          </View>
        </View>
        {reports.length > 0 ? (
          reports.map((report) => (
            <View key={report.id} style={styles.feedRow}>
              <View style={styles.feedIconWrap}>
                <Ionicons name={getActivityIcon(report.status)} size={18} color="#dbeafe" />
              </View>
              <View style={styles.feedBody}>
                <Text style={styles.feedHeadline}>{getSpotTypeLabel(report.spot_type)}</Text>
                <Text style={styles.feedMeta}>
                  {formatRelativeDate(report.created_at)} • {report.confirm_count || 0} потвърждения • {report.taken_count || 0} маркирания като заето
                </Text>
              </View>
              <Text style={styles.feedStatus}>{report.status === 'taken' ? 'заето' : 'активно'}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyStateBox}>
            <Ionicons name="trail-sign-outline" size={18} color="#7dd3fc" />
            <View style={styles.emptyStateBody}>
              <Text style={styles.emptyStateTitle}>Все още няма активност по сигнали</Text>
              <Text style={styles.emptyText}>След като подадеш първи сигнал, тук ще виждаш неговите потвърждения и статуса му.</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

function SummaryCard({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number }) {
  return (
    <View style={styles.summaryCard}>
      <Ionicons name={icon} size={18} color="#7dd3fc" />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  )
}

function getActivityIcon(status: string) {
  return status === 'taken' ? 'close-circle-outline' : 'navigate-circle-outline'
}

function getSpotTypeLabel(spotType?: string) {
  if (spotType === 'blue_zone') return 'Място в синя зона'
  if (spotType === 'paid') return 'Място в зелена зона'
  return 'Безплатно място'
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
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(56,189,248,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  eyebrow: {
    color: '#38bdf8',
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
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatBlock: {
    flex: 1,
  },
  heroStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 14,
  },
  heroStatLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroStatValue: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 6,
  },
  heroStatValueSmall: {
    color: '#dbeafe',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  summaryValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
  },
  summaryLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  feedCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  feedTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  feedCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(125,211,252,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.2)',
  },
  feedCountBadgeText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '800',
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  feedIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(37,99,235,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedBody: {
    flex: 1,
  },
  feedHeadline: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  feedMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  feedStatus: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  emptyStateBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#111827',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  emptyStateBody: {
    flex: 1,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
})