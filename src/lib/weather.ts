import { useEffect, useState } from 'react'

export type OutdoorMode = 'outdoor' | 'mixed' | 'indoor'

export interface Weather {
  temperature: number
  feelsLike: number
  code: number
  windSpeed: number
  label: string
  // Highest chance of rain in the next three hours, 0–100.
  rainChanceSoon: number
  // Local time ("15:00") of the first hour with a likely shower, if any.
  rainFrom: string | null
  mode: OutdoorMode
  advice: string
  updatedAt: Date
}

// WMO weather codes used by Open-Meteo (free, no API key).
function describe(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 2) return 'Partly cloudy'
  if (code === 3) return 'Cloudy'
  if (code <= 48) return 'Fog'
  if (code <= 57) return 'Drizzle'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Showers'
  if (code <= 86) return 'Snow showers'
  return 'Thunderstorm'
}

const isWet = (code: number) => code >= 51

// Advice for a toddler (who can't keep warm by running around): judged on the
// "feels like" temperature, current rain and the next few hours.
function advise(feelsLike: number, code: number, wind: number, rainSoon: number): { mode: OutdoorMode; advice: string } {
  if (isWet(code)) return { mode: 'indoor', advice: 'It’s wet out — a good day for indoor play.' }
  if (feelsLike <= 0) return { mode: 'indoor', advice: 'Freezing for a little one — better stay indoors.' }
  if (wind >= 35) return { mode: 'indoor', advice: 'Very windy — indoor play is the better choice.' }
  if (rainSoon >= 60) return { mode: 'indoor', advice: 'Rain is likely soon — pick somewhere indoors.' }
  if (feelsLike < 10) return { mode: 'mixed', advice: 'Chilly — fine for a short, well-wrapped walk, otherwise go indoors.' }
  if (rainSoon >= 30) return { mode: 'mixed', advice: 'Mild, but showers are possible — take a rain cover.' }
  return { mode: 'outdoor', advice: 'Pleasant weather — a good day to be outside.' }
}

const REFRESH_MS = 10 * 60 * 1000

export function useWeather(lat = 59.437, lng = 24.7536) {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let controller = new AbortController()
    const load = () => {
      controller.abort()
      controller = new AbortController()
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m' +
        '&hourly=precipitation_probability&forecast_hours=4&timezone=Europe%2FTallinn'
      fetch(url, { signal: controller.signal, cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((data) => {
          const c = data.current
          const probs: number[] = data.hourly?.precipitation_probability ?? []
          const times: string[] = data.hourly?.time ?? []
          const soon = probs.slice(0, 3)
          const rainIdx = soon.findIndex((p) => p >= 50)
          const feelsLike = Math.round(c.apparent_temperature)
          const code = c.weather_code as number
          const wind = Math.round(c.wind_speed_10m)
          const rainChanceSoon = soon.length ? Math.max(...soon) : 0
          setWeather({
            temperature: Math.round(c.temperature_2m),
            feelsLike,
            code,
            windSpeed: wind,
            label: describe(code),
            rainChanceSoon,
            rainFrom: rainIdx >= 0 ? (times[rainIdx]?.slice(11, 16) ?? null) : null,
            ...advise(feelsLike, code, wind, rainChanceSoon),
            updatedAt: new Date(),
          })
          setError(false)
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            console.warn('Weather unavailable', e)
            setError(true)
          }
        })
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    // Refresh when the app comes back to the foreground (phones pause timers in the background).
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      controller.abort()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [lat, lng])

  return { weather, error }
}
