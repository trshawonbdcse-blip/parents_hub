import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CityPicker } from '../components/CityPicker'
import { ACTIVITY_ICON, activities, fitFor, providersOf } from '../lib/activities'
import { placesIn, useCity } from '../lib/city'
import { useT } from '../lib/i18n'
import { formatAge } from '../lib/places'
import { useChild } from '../lib/useChild'
import { useAllPlaces } from '../lib/osm'

const ORDER = { now: 0, soon: 1, unknown: 2, later: 3, older: 4 }

export function Activities() {
  const { t } = useT()
  const { months, name } = useChild()
  const [city] = useCity()
  const all = useAllPlaces()
  const pool = placesIn(city, all)
  const [show, setShow] = useState<'all' | 'now' | 'soon'>('all')
  const sorted = activities().sort((a, b) => ORDER[fitFor(a, months)] - ORDER[fitFor(b, months)] || a.fromMonths - b.fromMonths)
  const nowCount = sorted.filter((a) => fitFor(a, months) === 'now').length
  const first = sorted.find((a) => fitFor(a, months) === 'now') ?? sorted[0]
  const list = show === 'all' ? sorted : sorted.filter((a) => fitFor(a, months) === show)

  return (
    <div className="page">
      <div className="title-row">
        <h1 className="page-title">{t('Activities')}</h1>
        <CityPicker />
      </div>
      <section className="hero">
        {months !== null ? (
          <>
            <span className="hero-badge">{t('Ideas for {age}', { age: formatAge(months) })}</span>
            <div className="hero-stack">
              <span className="hero-number">{nowCount}</span>
              <span className="hero-label">{t('activities {name} can start now', { name: name || t('your child') })}</span>
            </div>
            {first && (
              <Link to={`/activity/${first.key}`} className="hero-action">
                {t('How to start {activity}', { activity: first.name.toLowerCase() })} <ChevronRight size={18} aria-hidden="true" />
              </Link>
            )}
          </>
        ) : (
          <>
            <p className="hero-title">{t('What children can start at each age, and how to begin.')}</p>
            <Link to="/me?tab=family" className="hero-action">
              {t("Add your child's age")} <ChevronRight size={18} aria-hidden="true" />
            </Link>
          </>
        )}
      </section>

      {months !== null && (
        <div className="chip-row" role="group" aria-label={t('Show')}>
          {(
            [
              ['all', 'All'],
              ['now', 'Good now'],
              ['soon', 'Soon'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} className={`chip ${show === k ? 'on' : ''}`} aria-pressed={show === k} onClick={() => setShow(k)}>
              {t(label)}
            </button>
          ))}
        </div>
      )}

      <ul className="activity-list">
        {list.map((a) => {
          const Icon = ACTIVITY_ICON[a.key]
          const fit = fitFor(a, months)
          const n = providersOf(a.key, pool).length
          return (
            <li key={a.key}>
              <Link to={`/activity/${a.key}`} className={`activity-row fit-${fit}`}>
                <span className="activity-icon">{Icon && <Icon size={22} />}</span>
                <span className="row-text">
                  <strong>{a.name}</strong>
                  <small>
                    {(a.fromMonths === 0 ? t('From birth') : t('From {age}', { age: formatAge(a.fromMonths) }))}
                    {n > 0 ? ` · ${t(n === 1 ? '{n} place' : '{n} places', { n })}` : ''}
                  </small>
                </span>
                {fit === 'now' && <span className="badge badge-free">{t('Good now')}</span>}
                {fit === 'soon' && <span className="badge">{t('Soon')}</span>}
                <ChevronRight size={18} className="muted" />
              </Link>
            </li>
          )
        })}
      </ul>
      {list.length === 0 && (
        <div className="empty">
          <p>{t('Nothing here for this age right now.')}</p>
          <button className="button secondary" onClick={() => setShow('all')}>
            {t('Show all activities')}
          </button>
        </div>
      )}
    </div>
  )
}
