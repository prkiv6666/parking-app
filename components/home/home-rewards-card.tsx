import React from 'react'
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

function getMilestoneWindow(points: number) {
  const milestones = [0, 50, 150, 300, 600, 1000, 1600]
  const next = milestones.find((milestone) => milestone > points)

  if (!next) {
    return {
      previous: milestones[milestones.length - 1],
      next: null,
      progress: 1,
      remaining: 0,
    }
  }

  const nextIndex = milestones.indexOf(next)
  const previous = milestones[Math.max(0, nextIndex - 1)]
  const range = Math.max(1, next - previous)

  return {
    previous,
    next,
    progress: Math.min(1, Math.max(0, (points - previous) / range)),
    remaining: next - points,
  }
}

type Props = {
  rewardCardScale: Animated.Value
  rank: string
  points: number
  trustScore: number
  badgesCount: number
  reportsCount: number
  visibleBadges: string[]
}

export function HomeRewardsCard({
  rewardCardScale,
  rank,
  points,
  trustScore,
  badgesCount,
  reportsCount,
  visibleBadges,
}: Props) {
  const milestone = getMilestoneWindow(points)

  return (
    <Animated.View style={[styles.rewardsCard, { transform: [{ scale: rewardCardScale }] }]}> 
      <View style={styles.rewardsCardHeader}>
        <View>
          <Text style={styles.rewardsEyebrow}>Твоят прогрес</Text>
          <Text style={styles.rewardsRank}>{rank}</Text>
        </View>
        <View style={styles.pointsBadge}>
          <Ionicons name="trophy" size={14} color="#facc15" />
          <Text style={styles.pointsBadgeText}>{points} т.</Text>
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Следващ праг</Text>
          <Text style={styles.progressMeta}>
            {milestone.next ? `Още ${milestone.remaining} т.` : 'Максимален праг'}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(10, milestone.progress * 100)}%` }]} />
        </View>

        <Text style={styles.progressCaption}>
          {milestone.next
            ? `Движиш се към ${milestone.next} точки и следващото ниво на доверие.`
            : 'Покрил си всички подготвени прагове в текущия дизайн.'}
        </Text>
      </View>

      <View style={styles.rewardsMetricsRow}>
        <View style={styles.rewardsMetricItem}>
          <Text style={styles.rewardsMetricValue}>{trustScore}</Text>
          <Text style={styles.rewardsMetricLabel}>Доверие</Text>
        </View>
        <View style={styles.rewardsMetricDivider} />
        <View style={styles.rewardsMetricItem}>
          <Text style={styles.rewardsMetricValue}>{badgesCount}</Text>
          <Text style={styles.rewardsMetricLabel}>Значки</Text>
        </View>
        <View style={styles.rewardsMetricDivider} />
        <View style={styles.rewardsMetricItem}>
          <Text style={styles.rewardsMetricValue}>{reportsCount}</Text>
          <Text style={styles.rewardsMetricLabel}>Сигнали</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow}>
        {visibleBadges.length > 0 ? (
          visibleBadges.map((badge) => (
            <View key={badge} style={styles.badgeChip}>
              <Ionicons name="ribbon" size={13} color="#0f172a" />
              <Text style={styles.badgeChipText}>{badge}</Text>
            </View>
          ))
        ) : (
          <View style={styles.badgeChipEmpty}>
            <Text style={styles.badgeChipEmptyText}>Първата значка идва след първия полезен сигнал.</Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  rewardsCard: {
    backgroundColor: 'rgba(15,23,42,0.78)',
    borderRadius: 24,
    padding: 16,
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rewardsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rewardsEyebrow: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  rewardsRank: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(250,204,21,0.14)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pointsBadgeText: {
    color: '#fef3c7',
    fontSize: 12,
    fontWeight: '800',
  },
  progressBlock: {
    marginTop: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '800',
  },
  progressMeta: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#38bdf8',
  },
  progressCaption: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  rewardsMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 14,
  },
  rewardsMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  rewardsMetricValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  rewardsMetricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  rewardsMetricDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgesRow: {
    gap: 8,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeChipText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '800',
  },
  badgeChipEmpty: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  badgeChipEmptyText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
})