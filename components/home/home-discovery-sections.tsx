import React from 'react'
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import {
  getConfidence,
  getDistanceMeters,
  getMarkerColor,
  getMarkerTitle,
  getMinutesLeft,
  getSpotTypeLabel,
  type ParkingReport,
} from '../../lib/home-screen'

type Coordinates = {
  latitude: number
  longitude: number
}

type Props = {
  recommendedReport: ParkingReport | null
  nearbyReports: ParkingReport[]
  distanceOrigin: Coordinates | null
  distanceLabel: string
  onOpenMap: () => void
  onSelectReport: (report: ParkingReport) => void
  onNavigateToRecommended: () => void
}

export function HomeDiscoverySections({
  recommendedReport,
  nearbyReports,
  distanceOrigin,
  distanceLabel,
  onOpenMap,
  onSelectReport,
  onNavigateToRecommended,
}: Props) {
  return (
    <>
      {recommendedReport ? (
        <View style={styles.recommendationCard}>
          <View style={styles.recommendationHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Препоръчано</Text>
              <Text style={styles.recommendationTitle}>{getMarkerTitle(recommendedReport)}</Text>
            </View>
            <View style={styles.recommendationBadge}>
              <Text style={styles.recommendationBadgeText}>{getConfidence(recommendedReport)}%</Text>
            </View>
          </View>

          <Text style={styles.recommendationMeta}>
            {getSpotTypeLabel(recommendedReport.spot_type)}
            {distanceOrigin
              ? ` • ${Math.round(
                  getDistanceMeters(
                    distanceOrigin.latitude,
                    distanceOrigin.longitude,
                    recommendedReport.latitude,
                    recommendedReport.longitude
                  )
                )} м ${distanceLabel}`
              : ''}
            {` • ${getMinutesLeft(recommendedReport.expires_at)} мин`}
          </Text>

          <View style={styles.recommendationActions}>
            <TouchableOpacity style={styles.recommendationPrimaryButton} onPress={() => onSelectReport(recommendedReport)}>
              <Text style={styles.recommendationPrimaryButtonText}>Виж мястото</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.recommendationSecondaryButton} onPress={onNavigateToRecommended}>
              <Ionicons name="navigate" size={16} color="#dbeafe" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.recommendationEmptyCard}>
          <View style={styles.recommendationEmptyIconWrap}>
            <Ionicons name="sparkles-outline" size={20} color="#0f766e" />
          </View>
          <Text style={styles.recommendationEmptyTitle}>Все още няма добра препоръка наблизо</Text>
          <Text style={styles.recommendationEmptyText}>
            Обнови района след малко или добави нов сигнал, когато освободиш място.
          </Text>
        </View>
      )}

      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitle}>Паркоместа наблизо</Text>
          <View style={styles.sectionCountBadge}>
            <Text style={styles.sectionCountBadgeText}>{nearbyReports.length}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onOpenMap}>
          <Text style={styles.sectionLink}>Виж картата</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.spotList}>
        {nearbyReports.length > 0 ? (
          nearbyReports.map((report) => (
            <Pressable key={report.id} style={styles.spotCard} onPress={() => onSelectReport(report)}>
              <View style={[styles.spotDot, { backgroundColor: getMarkerColor(report) }]} />
              <View style={styles.spotCardBody}>
                <Text style={styles.spotCardTitle}>{getMarkerTitle(report)}</Text>
                <Text style={styles.spotCardMeta}>
                  {getSpotTypeLabel(report.spot_type)} • {getConfidence(report)}% шанс
                </Text>
                <Text style={styles.spotCardSubmeta}>
                  {distanceOrigin
                    ? `${Math.round(
                        getDistanceMeters(
                          distanceOrigin.latitude,
                          distanceOrigin.longitude,
                          report.latitude,
                          report.longitude
                        )
                      )} м ${distanceLabel}`
                    : `${getMinutesLeft(report.expires_at)} мин оставащи`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748b" />
            </Pressable>
          ))
        ) : (
          <View style={styles.spotEmptyCard}>
            <Ionicons name="location-outline" size={20} color="#64748b" />
            <Text style={styles.spotEmptyTitle}>Все още няма активни сигнали в този филтър</Text>
            <Text style={styles.spotEmptyText}>
              Смени филтъра, обнови списъка или добави ново място, когато освободиш паркомясто.
            </Text>
            <TouchableOpacity style={styles.spotEmptyButton} onPress={onOpenMap}>
              <Text style={styles.spotEmptyButtonText}>Отвори картата</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  sectionEyebrow: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(125,211,252,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.2)',
  },
  sectionCountBadgeText: {
    color: '#dbeafe',
    fontSize: 12,
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
  spotEmptyButton: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  spotEmptyButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
})