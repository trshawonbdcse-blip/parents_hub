import { ChevronRight } from 'lucide-react'
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
  const list = activities().sort((a, b) => ORDER[fitFor(a, months)] - ORDER[fitFor(b, months)] || a.fromMonths - b.fromMonths)

  return (
    <div className="page">
      <div className="title-row">
        <h1 className="page-title">{t('Activities')}</h1>
        <CityPicker />
      </div>
      <p className="muted">
        {months !== null
          ? t('What {name} can start now, and how to begin.', { name: name || t('your child') })
          : t('What children can start at each age, and how to begin.')}
      </p>

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
    </div>
  )
}
