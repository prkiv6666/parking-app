const appJson = require('./app.json')

const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY

module.exports = () => {
  const expo = appJson.expo

  return {
    ...expo,
    android: {
      ...expo.android,
      config: {
        ...(expo.android?.config || {}),
        googleMaps: googleMapsApiKey
          ? {
              apiKey: googleMapsApiKey,
            }
          : expo.android?.config?.googleMaps,
      },
    },
    extra: {
      ...expo.extra,
      hasGoogleMapsApiKey: Boolean(googleMapsApiKey),
    },
  }
}