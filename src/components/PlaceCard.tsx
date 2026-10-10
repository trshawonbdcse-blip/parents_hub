import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CATEGORY_LABEL, priceSummary } from '../lib/places'
import { KEYS, useIdList } from '../lib/storage'
import type { Place } from '../types'
import { PlaceImage } from './ui'

interface Props {
  place: Place
  months: number | null
  distance?: number | null
  // "wide" fills the row (lists); "narrow" is a fixed-width card for horizontal carousels.
  variant?: 'wide' | 'narrow'
}

export function PlaceCard({ place, months, distance, variant = 'wide' }: Props) {
  const favorites = useIdList(KEYS.favorites)
  const fav = favorites.has(place.id)

  return (
    <article className={`place-card ${variant}`}>
      <Link to={`/place/${place.id}`} className="place-card-link">
        <div className="place-card-media">
          <PlaceImage photo={place.photos?.[0]} category={place.category} />
          {place.price.free && <span className="badge badge-free">Free</span>}
        </div>
        <div className="place-card-body">
          <p className="overline">
            {CATEGORY_LABEL[place.category].label} · {place.area}
            {distance != null && ` · ${distance.toFixed(1)} km`}
          </p>
          <h3>{place.name}</h3>
          <p className="price-line">{priceSummary(place, months)}</p>
        </div>
      </Link>
      <button
        className={`fav ${fav ? 'on' : ''}`}
        onClick={() => favorites.toggle(place.id)}
        aria-label={fav ? 'Remove from saved' : 'Save'}
        aria-pressed={fav}
      >
        <Heart size={18} fill={fav ? 'currentColor' : 'none'} />
      </button>
    </article>
  )
}
