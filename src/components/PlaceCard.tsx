import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { categoryLabel, priceShort } from '../lib/places'
import { KEYS, useIdList } from '../lib/storage'
import { acceptsStebby, useStebby } from '../lib/stebby'
import type { Place } from '../types'
import { PlaceImage } from './ui'
import { useT } from '../lib/i18n'

interface Props {
  place: Place
  months: number | null
  distance?: number | null
  // "wide" fills the row (lists); "narrow" is a fixed-width card for horizontal carousels.
  variant?: 'wide' | 'narrow'
}

export function PlaceCard({ place, months, distance, variant = 'wide' }: Props) {
  const { t } = useT()
  const favorites = useIdList(KEYS.favorites)
  const fav = favorites.has(place.id)
  const [hasStebby] = useStebby()
  const stebby = hasStebby && acceptsStebby(place)

  return (
    <article className={`place-card ${variant}`}>
      <Link to={`/place/${place.id}`} className="place-card-link">
        <div className="place-card-media">
          <PlaceImage photo={place.photos?.[0]} category={place.category} />
          {(place.price.free || stebby) && (
            <span className="media-badges">
              {place.price.free && <span className="badge badge-free">{t('Free')}</span>}
              {stebby && <span className="badge badge-stebby">Stebby ✓</span>}
            </span>
          )}
        </div>
        <div className="place-card-body">
          <p className="overline">
            {categoryLabel(place.category)} · {place.area === place.city || place.city === 'Tallinn' ? place.area : `${place.area}, ${place.city}`}
            {distance != null && ` · ${distance.toFixed(1)} km`}
          </p>
          <h3>{place.name}</h3>
          <p className="price-line">{priceShort(place, months)}</p>
        </div>
      </Link>
      <button
        className={`fav ${fav ? 'on' : ''}`}
        onClick={() => favorites.toggle(place.id)}
        aria-label={fav ? t('Remove from saved') : t('Save')}
        aria-pressed={fav}
      >
        <Heart size={18} fill={fav ? 'currentColor' : 'none'} />
      </button>
    </article>
  )
}
