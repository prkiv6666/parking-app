import {
  getConfidence,
  getConfidenceLabel,
  getDistanceMeters,
  getMarkerColor,
  getMarkerTitle,
  getSpotTypeLabel,
  isClaimActive,
  isReportStale,
  type FilterType,
  type NotificationPreferences,
  type ParkingReport,
} from './home-screen'

export type Coordinates = {
  latitude: number
  longitude: number
}

export const STREET_SEARCH_RADIUS_METERS = 700

export type ReportMapMarker = {
  id: string
  latitude: number
  longitude: number
  title: string
  description: string
  pinColor: string
  highlighted: boolean
}

export function shouldNotifyForReport(input: {
  report: ParkingReport
  distanceMeters: number
  sessionUserId?: string
  notificationPreferences: NotificationPreferences
  notifiedReportIds: Set<string>
}) {
  const { report, distanceMeters, sessionUserId, notificationPreferences, notifiedReportIds } = input

  if (!sessionUserId) return false
  if (report.report_user_id === sessionUserId) return false
  if (report.status !== 'active') return false
  if (isClaimActive(report)) return false
  if (notifiedReportIds.has(report.id)) return false
  if (distanceMeters > notificationPreferences.radius_m) return false
  if (getConfidence(report) < notificationPreferences.min_confidence) return false

  if (report.spot_type === 'free' && !notificationPreferences.allow_free) return false
  if (report.spot_type === 'blue_zone' && !notificationPreferences.allow_blue_zone) return false
  if (report.spot_type === 'paid' && !notificationPreferences.allow_paid) return false

  return true
}

export function filterReports(input: {
  reports: ParkingReport[]
  filter: FilterType
  searchQuery: string
}) {
  const normalizedQuery = input.searchQuery.trim().toLowerCase()

  return input.reports.filter((report) => {
    if (isReportStale(report)) return false

    if (normalizedQuery) {
      const searchableText = [
        getMarkerTitle(report),
        getSpotTypeLabel(report.spot_type),
        getConfidenceLabel(getConfidence(report)),
      ]
        .join(' ')
        .toLowerCase()

      if (!searchableText.includes(normalizedQuery)) return false
    }

    if (input.filter === 'all') return true
    if (input.filter === 'high_confidence') return getConfidence(report) >= 75

    return report.spot_type === input.filter
  })
}

export function buildMapMarkers(reports: ParkingReport[]): ReportMapMarker[] {
  return reports.map((report) => ({
    id: report.id,
    latitude: report.latitude,
    longitude: report.longitude,
    title: getMarkerTitle(report),
    description: `Тип: ${getSpotTypeLabel(report.spot_type)} | Шанс: ${getConfidence(report)}%`,
    pinColor: getMarkerColor(report),
    highlighted: getConfidence(report) >= 80 && !isClaimActive(report),
  }))
}

export function rankReports(reports: ParkingReport[], location: Coordinates | null) {
  return [...reports].sort((left, right) => {
    const leftDistance = location
      ? getDistanceMeters(location.latitude, location.longitude, left.latitude, left.longitude)
      : Number.MAX_SAFE_INTEGER
    const rightDistance = location
      ? getDistanceMeters(location.latitude, location.longitude, right.latitude, right.longitude)
      : Number.MAX_SAFE_INTEGER

    const leftScore = getConfidence(left) - leftDistance / 120
    const rightScore = getConfidence(right) - rightDistance / 120

    return rightScore - leftScore
  })
}

export function buildNavigationUrl(input: {
  report: Pick<ParkingReport, 'latitude' | 'longitude'>
  location: Coordinates | null
  platformOS: string
}) {
  const { report, location, platformOS } = input
  const origin = location ? `${location.latitude},${location.longitude}` : ''

  const googleMapsUrl = origin
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${report.latitude},${report.longitude}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}&travelmode=driving`

  const appleMapsUrl = origin
    ? `http://maps.apple.com/?saddr=${origin}&daddr=${report.latitude},${report.longitude}&dirflg=d`
    : `http://maps.apple.com/?daddr=${report.latitude},${report.longitude}&dirflg=d`

  return platformOS === 'ios' ? appleMapsUrl : googleMapsUrl
}

export function filterReportsByDistance(input: {
  reports: ParkingReport[]
  center: Coordinates | null
  radiusMeters: number
}) {
  const { reports, center, radiusMeters } = input

  if (!center) return reports

  return reports.filter((report) => {
    const distance = getDistanceMeters(center.latitude, center.longitude, report.latitude, report.longitude)
    return distance <= radiusMeters
  })
}