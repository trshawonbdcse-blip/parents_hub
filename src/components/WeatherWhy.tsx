import { CloudRain, CloudSun, Moon, Snowflake, Sun, Thermometer, Wind } from 'lucide-react'
import { useT } from '../lib/i18n'
import type { Scene } from '../lib/scene'
import type { Weather } from '../lib/weather'

const ICON = { hot: Sun, mild: CloudSun, 'rain-later': CloudSun, cold: Thermometer, rain: CloudRain, snow: Snowflake, windy: Wind, evening: Moon }

// The line above today's ideas that says what it's like outside and why these ideas.
export function WeatherWhy({ weather, scene, adult, sea }: { weather: Weather | null; scene: Scene; adult: boolean; sea?: number | null }) {
  const { t } = useT()
  const Icon = ICON[scene.key]
  const why: Record<Scene['key'], string> = {
    hot: t('Warm: water and shade first'),
    mild: t('Dry: a good time to be outside'),
    'rain-later': t('Outside now, indoors after {time}', { time: scene.rainFrom ?? '' }),
    cold: adult ? t('Chilly but dry: fine for a walk if you dress warm') : t('Too cold for a little one: indoor ideas'),
    rain: t('Wet outside: indoor ideas'),
    snow: adult ? t('Snow: skating, sledging and a warm-up after') : t('Snow: sledging and skating, then somewhere warm'),
    windy: t('Strong wind: no beaches or viewpoints today'),
    evening: adult ? t('Evening: shows, spa and cinema') : t('Evening: something calm indoors'),
  }
  const title = weather
    ? [`${t(weather.label)}, ${weather.temperature}°`, scene.rainFrom ? t('rain from {time}', { time: scene.rainFrom }) : null, scene.key === 'evening' && weather.sunset ? t('sunset {time}', { time: weather.sunset }) : null]
        .filter(Boolean)
        .join(' · ')
    : t('Weather not available right now')
  const hours = weather?.hours.slice(0, 6) ?? []
  const showHours = hours.some((h) => h.rain >= 50) && scene.key !== 'evening'
  return (
    <div className="weather-why">
      <Icon size={22} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>
          {why[scene.key]}
          {sea != null ? ` · ${t('sea {n}°', { n: sea })}` : ''}
        </span>
        {showHours && (
          <ol className="rain-line" aria-label={t('Chance of rain by hour')}>
            {hours.map((h, i) => (
              <li key={h.time} className={`${h.rain >= 50 ? 'rain' : ''} ${i === 0 ? 'now' : ''}`} title={`${h.rain}%`}>
                {h.time.slice(0, 2)}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
