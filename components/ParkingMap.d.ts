declare module '../../components/ParkingMap' {
  import type { ComponentType } from 'react'

  type ParkingMapProps = {
    region: {
      latitude: number
      longitude: number
      latitudeDelta: number
      longitudeDelta: number
    }
    markers: {
      id: string
      latitude: number
      longitude: number
      title: string
      description: string
      pinColor: string
    }[]
    onSelectMarker: (reportId: string) => void
  }

  const ParkingMap: ComponentType<ParkingMapProps>

  export default ParkingMap
}
