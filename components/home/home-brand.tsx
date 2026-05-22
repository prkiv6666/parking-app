import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { BrandColors } from '../../constants/brand'

export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendPill}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  )
}

export function ParkRadarLogo({
  size,
  wordmarkSize,
  compact = false,
}: {
  size: number
  wordmarkSize: 'small' | 'large'
  compact?: boolean
}) {
  const textSize = wordmarkSize === 'large' ? 30 : 20
  const lineWidth = Math.max(3, Math.round(size * 0.06))

  return (
    <View style={[styles.logoWrap, compact && styles.logoWrapCompact]}>
      <View style={[styles.logoMarkFrame, { width: size, height: size + size * 0.14 }]}> 
        <View
          style={[
            styles.logoPinTail,
            {
              width: size * 0.34,
              height: size * 0.34,
              left: size * 0.33,
              bottom: size * 0.02,
            },
          ]}
        />
        <View
          style={[
            styles.logoMark,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <View style={[styles.logoGradientLeft, { borderRadius: size / 2 }]} />
          <View style={[styles.logoGradientRight, { borderRadius: size / 2 }]} />
          <View
            style={[
              styles.logoRing,
              {
                width: size * 0.72,
                height: size * 0.72,
                borderRadius: size * 0.36,
                borderWidth: lineWidth,
              },
            ]}
          />
          <View
            style={[
              styles.logoRing,
              styles.logoRingInner,
              {
                width: size * 0.4,
                height: size * 0.4,
                borderRadius: size * 0.2,
                borderWidth: lineWidth,
              },
            ]}
          />
          <View
            style={[
              styles.logoCenterDot,
              {
                width: size * 0.16,
                height: size * 0.16,
                borderRadius: size * 0.08,
              },
            ]}
          />
          <View
            style={[
              styles.logoSweep,
              {
                width: size * 0.45,
                height: lineWidth,
                top: size * 0.27,
                left: size * 0.48,
                borderRadius: lineWidth,
              },
            ]}
          />
        </View>
      </View>
      <View style={styles.logoWordmark}>
        <Text style={[styles.logoWordmarkPark, { fontSize: textSize }]}>Park</Text>
        <Text style={[styles.logoWordmarkRadar, { fontSize: textSize }]}>Radar</Text>
      </View>
    </View>
  )
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 8,
  },
  legendText: {
    color: BrandColors.paper,
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: BrandColors.asphalt900,
    transform: [{ rotate: '45deg' }],
    opacity: 0.96,
  },
  logoMark: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.asphalt900,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  logoGradientLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '54%',
    backgroundColor: BrandColors.signalCyan,
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
    borderColor: BrandColors.paper,
    backgroundColor: 'rgba(13,15,19,0.78)',
  },
  logoRingInner: {
    backgroundColor: 'rgba(13,15,19,0.9)',
  },
  logoCenterDot: {
    backgroundColor: '#d9ff57',
    borderWidth: 2,
    borderColor: BrandColors.asphalt900,
    zIndex: 2,
  },
  logoSweep: {
    position: 'absolute',
    backgroundColor: BrandColors.paper,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
})