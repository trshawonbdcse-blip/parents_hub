import { ArrowLeft, Backpack, CalendarClock, Check, Lightbulb, Wallet } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CityPicker } from '../components/CityPicker'
import { PlaceRow } from '../components/PlaceRow'
import { ACTIVITY_ICON, activityByKey, fitFor, practiceFor, providersOf } from '../lib/activities'
import { ALL, cityName, placesIn, useCity } from '../lib/city'
import { useT } from '../lib/i18n'
import { formatAge } from '../lib/places'
import { useChild } from '../lib/useChild'
import { useAllPlaces } from '../lib/osm'

export function ActivityDetail() {
  const { t } = useT()
  const { key = '' } = useParams()
  const navigate = useNavigate()
  const { months, name, napStart } = useChild()
  const [city] = useCity()
  const a = activityByKey(key)
  const all = useAllPlaces()

  if (!a) {
    return (
      <div className="page">
        <p>{t('Not found.')}</p>
        <Link to="/activities">{t('All activities')}</Link>
      </div>
    )
  }

  const Icon = ACTIVITY_ICON[a.key]
  const pool = placesIn(city, all)
  const providers = providersOf(a.key, pool)
  const practice = practiceFor(a.key, pool)
  const elsewhere = city !== ALL && providers.length === 0 ? providersOf(a.key, all) : []
  const fit = fitFor(a, months)
  const who = name || t('your child')

  return (
    <div className="page">
      <div className="title-row">
        <button className="icon-button plain" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/activities'))} aria-label={t('Back')}>
          <ArrowLeft size={20} />
        </button>
        <CityPicker />
      </div>

      <header className="hero activity-hero">
        <span className="activity-icon big">{Icon && <Icon size={30} />}</span>
        <div>
          <h1>{a.name}</h1>
          <p className="muted">
            {(a.fromMonths === 0 ? t('From birth') : t('From {age}', { age: formatAge(a.fromMonths) }))}
            {fit === 'now' && ` · ${t('{name} can start now', { name: who })}`}
            {(fit === 'soon' || fit === 'later') &&
              months !== null &&
              ` · ${t('{name} can start in {n} months', { name: who, n: a.fromMonths - months })}`}
          </p>
        </div>
      </header>

      <p className="lead">{a.summary}</p>

      <section className="block">
        <h2>{t('How to start')}</h2>
        <ol className="steps">
          {a.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {a.key === 'swimming' && napStart && <p className="callout small">{t('Tip: your nap time is {time} — pick a lesson well before or after it.', { time: napStart })}</p>}
      </section>

      <div className="facts two">
        <div>
          <Wallet size={18} />
          <span>{a.price}</span>
        </div>
        <div>
          <CalendarClock size={18} />
          <span>{a.howOften}</span>
        </div>
      </div>

      <section className="block">
        <h2 className="with-icon">
          <Backpack size={18} /> {t('What to bring')}
        </h2>
        <ul className="checklist">
          {a.bring.map((b) => (
            <li key={b}>
              <Check size={16} /> {b}
            </li>
          ))}
        </ul>
      </section>

      <section className="block">
        <h2>{t('Why it’s good')}</h2>
        <ul className="bullets">
          {a.why.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </section>

      {a.tips.length > 0 && (
        <aside className="callout">
          <Lightbulb size={18} />
          <div>
            {a.tips.map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
          </div>
        </aside>
      )}

      <section className="block">
        <h2>{city === ALL ? t('Courses and groups') : t('Courses and groups in {city}', { city: cityName(city) })}</h2>
        {providers.length > 0 ? (
          <div className="row-list">
            {providers.map((p) => (
              <PlaceRow key={p.id} place={p} months={months} />
            ))}
          </div>
        ) : (
          <p className="muted small">
            {t('We don’t list a course here yet.')}
            {elsewhere.length > 0 && ` ${t('Nearest options are in other towns:')}`}
          </p>
        )}
        {elsewhere.length > 0 && (
          <div className="row-list">
            {elsewhere.slice(0, 4).map((p) => (
              <PlaceRow key={p.id} place={p} months={months} />
            ))}
          </div>
        )}
      </section>

      {practice.length > 0 && (
        <section className="block">
          <h2>{t('Practise together')}</h2>
          <div className="row-list">
            {practice.slice(0, 6).map((p) => (
              <PlaceRow key={p.id} place={p} months={months} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
