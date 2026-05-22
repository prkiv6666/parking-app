import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { ParkRadarLogo } from './home-brand'
import { FILTER_OPTIONS, type FilterType } from '../../lib/home-screen'

type Props = {
  loadingLocation: boolean
  dashboardSubtext: string
  profileLabel: string
  trustScore: number
  locationLabel: string
  notificationEnabled: boolean
  notificationBusy: boolean
  refreshing: boolean
  filter: FilterType
  filteredReportsCount: number
  onToggleNotifications: () => void
  onRefresh: () => void
  onFilterChange: (value: FilterType) => void
  onOpenMap: () => void
}

export function HomeDashboardIntro({
  loadingLocation,
  dashboardSubtext,
  profileLabel,
  trustScore,
  locationLabel,
  notificationEnabled,
  notificationBusy,
  refreshing,
  filter,
  filteredReportsCount,
  onToggleNotifications,
  onRefresh,
  onFilterChange,
  onOpenMap,
}: Props) {
  const filterLabel = FILTER_OPTIONS.find((option) => option.value === filter)?.label ?? 'Всички'

  return (
    <>
      <View style={styles.dashboardHeader}>
        <View>
          <ParkRadarLogo size={44} wordmarkSize="small" compact />
          <Text style={styles.dashboardSubtext}>Свободни места в реално време</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.dashboardIconButton, notificationEnabled && styles.notificationIconButtonActive]}
            onPress={onToggleNotifications}
            disabled={notificationBusy}
          >
            <Ionicons
              name={notificationEnabled ? 'notifications' : 'notifications-outline'}
              size={20}
              color={notificationEnabled ? '#fff' : '#dbeafe'}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.dashboardIconButton} onPress={onRefresh}>
            <Ionicons name={refreshing ? 'hourglass-outline' : 'refresh'} size={19} color="#dbeafe" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <View style={styles.heroTitleWrap}>
            <Text style={styles.heroEyebrow}>Основен поток</Text>
            <Text style={styles.heroTitle}>Отвори картата и действай бързо</Text>
          </View>

          <View style={styles.heroCountBadge}>
            <Text style={styles.heroCountBadgeValue}>{filteredReportsCount}</Text>
            <Text style={styles.heroCountBadgeLabel}>активни</Text>
          </View>
        </View>

        <Text style={styles.heroSubtitle}>{loadingLocation ? 'Зареждане на локация...' : dashboardSubtext}</Text>

        <View style={styles.statusGrid}>
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Известия</Text>
            <Text style={styles.statusValue}>{notificationEnabled ? 'Включени' : 'Изключени'}</Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Филтър</Text>
            <Text style={styles.statusValue}>{filterLabel}</Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Състояние</Text>
            <Text style={styles.statusValue}>{refreshing ? 'Обновява' : 'Готово'}</Text>
          </View>
        </View>

        <View style={styles.heroMetaRow}>
          <View style={styles.locationPill}>
            <Ionicons name="locate" size={13} color="#8de93b" />
            <Text style={styles.locationPillText}>{locationLabel}</Text>
          </View>

          <View style={styles.trustPillDashboard}>
            <Ionicons name="sparkles-outline" size={14} color="#dbeafe" />
            <Text style={styles.trustPillText}>{profileLabel} • Доверие {trustScore}</Text>
          </View>
        </View>

        <Pressable style={styles.primaryMapCard} onPress={onOpenMap}>
          <View style={styles.mapCtaIconWrap}>
            <Ionicons name="map-outline" size={22} color="#6ee7b7" />
          </View>
          <View style={styles.mapCtaTextWrap}>
            <Text style={styles.mapCtaTitle}>Отвори картата и търсенето</Text>
            <Text style={styles.mapCtaSubtitle}>Маркерите, търсенето по улица и най-близките места са тук.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </Pressable>
      </View>

      <View style={styles.filterHeaderRow}>
        <Text style={styles.filterHeaderTitle}>Филтрирай списъка</Text>
        <Text style={styles.filterHeaderMeta}>{filteredReportsCount} резултата</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {FILTER_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onFilterChange(option.value)}
            style={[styles.homeFilterChip, filter === option.value && styles.homeFilterChipActive]}
          >
            <Text style={[styles.homeFilterChipText, filter === option.value && styles.homeFilterChipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
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
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  dashboardIconButton: {
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
  heroCard: {
    backgroundColor: 'rgba(9,15,27,0.92)',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroTitleWrap: {
    flex: 1,
  },
  heroEyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#f8fafc',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    marginTop: 6,
    maxWidth: 240,
  },
  heroCountBadge: {
    backgroundColor: 'rgba(37,99,235,0.18)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 74,
  },
  heroCountBadgeValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  heroCountBadgeLabel: {
    color: '#bfdbfe',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  heroSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    marginTop: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  statusCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statusLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusValue: {
    color: '#f8fafc',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  heroMetaRow: {
    gap: 8,
    marginTop: 14,
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
    maxWidth: '100%',
  },
  trustPillText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '700',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
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
  primaryMapCard: {
    marginTop: 16,
    backgroundColor: '#101828',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterHeaderTitle: {
    color: '#dbeafe',
    fontSize: 13,
    fontWeight: '800',
  },
  filterHeaderMeta: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
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
    lineHeight: 18,
  },
})
