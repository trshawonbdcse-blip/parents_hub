import { BadgeCheck, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useT } from '../lib/i18n'
import { categoryLabel, isChecked, priceShort } from '../lib/places'
import { acceptsStebby, useStebby } from '../lib/stebby'
import type { Place } from '../types'
import { CATEGORY_ICON } from './ui'

// Compact list row: small photo (or category tile), name, where, price and badges.
export function PlaceRow({ place, months, distance }: { place: Place; months: number | null; distance?: number | null }) {
  const { t } = useT()
  const [hasStebby] = useStebby()
  const Icon = CATEGORY_ICON[place.category]
  const photo = place.photos?.[0]
  const price = priceShort(place, months).split(' · ')
  const where = place.area === place.city || place.city === 'Tallinn' ? place.area : `${place.area}, ${place.city}`
  return (
    <Link to={`/place/${place.id}`} className="place-row">
      <span className={`thumb cat-${place.category}`}>
        {photo ? <img src={photo.src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} /> : null}
        <Icon size={22} aria-hidden="true" />
      </span>
      <span className="place-row-text">
        <strong>{place.name}</strong>
        <small>
          {categoryLabel(place.category)} · {where}
          {distance != null && ` · ${distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}`}
        </small>
        {(isChecked(place) || (hasStebby && acceptsStebby(place))) && (
          <span className="place-row-meta">
            {isChecked(place) && (
              <span className="mini-badge checked" title={t('Checked by us')}>
                <BadgeCheck size={13} aria-hidden="true" /> {t('Checked')}
              </span>
            )}
            {hasStebby && acceptsStebby(place) && <span className="mini-badge stebby">Stebby</span>}
          </span>
        )}
      </span>
      <span className="place-row-value">
        <span className={place.price.free ? 'price free' : 'price'}>{price[0]}</span>
        {price.length > 1 && <small className="price-note">{price.slice(1).join(' · ')}</small>}
      </span>
      <ChevronRight size={18} className="muted" aria-hidden="true" />
    </Link>
  )
}
