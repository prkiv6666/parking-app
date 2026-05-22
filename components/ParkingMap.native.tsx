import React, { useEffect, useRef } from 'react'
import { Animated, Platform, StyleSheet, View } from 'react-native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'

type Region = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

type MarkerItem = {
  id: string
  latitude: number
  longitude: number
  title: string
  description: string
  pinColor: string
  highlighted?: boolean
}

export default function ParkingMap({
  region,
  markers,
  onSelectMarker,
  selectedMarkerId,
}: {
  region: Region
  markers: MarkerItem[]
  onSelectMarker: (reportId: string) => void
  selectedMarkerId?: string | null
}) {
  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      region={region}
      showsUserLocation
      showsMyLocationButton
    >
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          anchor={{ x: 0.5, y: 1 }}
          coordinate={{
            latitude: marker.latitude,
            longitude: marker.longitude,
          }}
          title={marker.title}
          description={marker.description}
          tracksViewChanges
          onPress={() => onSelectMarker(marker.id)}
        >
          <PulseMarker
            color={marker.pinColor}
            isHighlighted={Boolean(marker.highlighted)}
            isSelected={selectedMarkerId === marker.id}
          />
        </Marker>
      ))}
    </MapView>
  )
}

function PulseMarker({
  color,
  isHighlighted,
  isSelected,
}: {
  color: string
  isHighlighted: boolean
  isSelected: boolean
}) {
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!isHighlighted && !isSelected) {
      pulse.stopAnimation()
      pulse.setValue(0)
      return
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: isSelected ? 900 : 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    )

    loop.start()

    return () => {
      loop.stop()
    }
  }, [isHighlighted, isSelected, pulse])

  const haloOpacity = pulse.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [isSelected ? 0.34 : 0.2, 0.14, 0],
  })

  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isSelected ? 2.7 : 2.2],
  })

  return (
    <View style={styles.markerWrap} pointerEvents="none">
      {(isHighlighted || isSelected) ? (
        <Animated.View
          style={[
            styles.markerHalo,
            {
              backgroundColor: color,
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            },
          ]}
        />
      ) : null}

      <View
        style={[
          styles.pinShell,
          styles.markerCoreShadow,
          { transform: [{ scale: isSelected ? 1.12 : 1 }] },
        ]}
      >
        <View
          style={[
            styles.pinHead,
            {
              backgroundColor: color,
              borderColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.35)',
            },
          ]}
        >
          <View style={styles.markerInner} />
        </View>

        <View
          style={[
            styles.pinTail,
            {
              backgroundColor: color,
              borderColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.35)',
            },
          ]}
        />

        <View style={styles.pinTip} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  markerWrap: {
    width: 44,
    height: 52,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  markerHalo: {
    position: 'absolute',
    bottom: 8,
    width: 18,
    height: 18,
    borderRadius: 999,
  },
  markerCoreShadow: {
    shadowColor: '#020617',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pinShell: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pinHead: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinTail: {
    width: 14,
    height: 14,
    marginTop: -4,
    borderWidth: 2,
    borderTopWidth: 0,
    transform: [{ rotate: '45deg' }],
    borderBottomLeftRadius: 3,
  },
  pinTip: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#08111f',
    marginTop: -1,
    marginBottom: 1,
  },
  markerInner: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
})