import React from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

type MarkerItem = {
  id: string
  latitude: number
  longitude: number
  title: string
  description: string
  pinColor: string
}

export default function ParkingMap({
  markers,
  onSelectMarker,
}: {
  region: {
    latitude: number
    longitude: number
    latitudeDelta: number
    longitudeDelta: number
  }
  markers: MarkerItem[]
  onSelectMarker: (reportId: string) => void
}) {
  return (
    <View style={styles.webMapFallback}>
      <View style={styles.webMapFallbackCard}>
        <Text style={styles.webMapFallbackTitle}>Уеб преглед</Text>
        <Text style={styles.webMapFallbackText}>
          Картата не е активна в web режима, но можеш да тестваш логиката, филтрите и докосването на сигнали.
        </Text>
        <Text style={styles.webMapFallbackSubtext}>Активни места: {markers.length}</Text>
      </View>

      <ScrollView
        style={styles.reportList}
        contentContainerStyle={styles.reportListContent}
        showsVerticalScrollIndicator={false}
      >
        {markers.map((marker) => (
          <Pressable
            key={marker.id}
            style={styles.reportCard}
            onPress={() => onSelectMarker(marker.id)}
          >
            <View style={[styles.reportDot, { backgroundColor: marker.pinColor }]} />
            <View style={styles.reportBody}>
              <Text style={styles.reportTitle}>{marker.title}</Text>
              <Text style={styles.reportDescription}>{marker.description}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  webMapFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#08111f',
    paddingHorizontal: 20,
    paddingTop: 180,
    paddingBottom: 180,
  },
  webMapFallbackCard: {
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  webMapFallbackTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  webMapFallbackText: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  webMapFallbackSubtext: {
    color: '#8de93b',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
  },
  reportList: {
    marginTop: 16,
  },
  reportListContent: {
    gap: 10,
    paddingBottom: 40,
  },
  reportCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  reportDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  reportBody: {
    flex: 1,
  },
  reportTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  reportDescription: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
})