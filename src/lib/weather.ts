import { useEffect, useState } from 'react'

export interface Weather {
  temperature: number
  code: number
  windSpeed: number
  label: string
  emoji: string
  goodForOutdoor: boolean
}

// WMO weather codes used by Open-Meteo (free, no API key).
function describe(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: 'Clear sky', emoji: '☀️' }
  if (code <= 2) return { label: 'Partly cloudy', emoji: '⛅' }
  if (code === 3) return { label: 'Cloudy', emoji: '☁️' }
  if (code <= 48) return { label: 'Fog', emoji: '🌫️' }
  if (code <= 57) return { label: 'Drizzle', emoji: '🌦️' }
  if (code <= 67) return { label: 'Rain', emoji: '🌧️' }
  if (code <= 77) return { label: 'Snow', emoji: '🌨️' }
  if (code <= 82) return { label: 'Rain showers', emoji: '🌧️' }
  if (code <= 86) return { label: 'Snow showers', emoji: '🌨️' }
  return { label: 'Thunderstorm', emoji: '⛈️' }
}

const isWet = (code: number) => code >= 51

export function useWeather(lat = 59.437, lng = 24.7536) {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      '&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe%2FTallinn'
    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        const temperature = Math.round(data.current.temperature_2m)
        const code = data.current.weather_code as number
        const windSpeed = Math.round(data.current.wind_speed_10m)
        setWeather({
          temperature,
          code,
          windSpeed,
          ...describe(code),
          // A toddler outing outside is comfortable roughly from 5°C, dry, not too windy.
          goodForOutdoor: temperature >= 5 && !isWet(code) && windSpeed < 30,
        })
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          console.warn('Weather unavailable', e)
          setError(true)
        }
      })
    return () => controller.abort()
  }, [lat, lng])

  return { weather, error }
}
