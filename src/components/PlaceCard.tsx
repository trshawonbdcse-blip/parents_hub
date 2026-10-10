import { Link } from 'react-router-dom'
import type { Place } from '../types'
import { adultPriceText, CATEGORY_LABEL, childPriceText, parkingLabel, settingLabel } from '../lib/places'
import { KEYS, useIdList } from '../lib/storage'

interface Props {
  place: Place
  months: number | null
  distance?: number | null
}

export function PlaceCard({ place, months, distance }: Props) {
  const favorites = useIdList(KEYS.favorites)
  const cat = CATEGORY_LABEL[place.category]
  const fav = favorites.has(place.id)

  return (
    <article className="card place-card">
      <Link to={`/place/${place.id}`} className="place-card-link">
        <div className={`place-thumb cat-${place.category}`} aria-hidden="true">
          {place.photos?.[0] ? (
            <img
              src={place.photos[0].src}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => e.currentTarget.remove()}
            />
          ) : (
            cat.emoji
          )}
        </div>
        <div className="place-card-body">
          <h3>{place.name}</h3>
          <p className="muted small">
            {cat.label} · {place.area}
            {distance != null && ` · ${distance.toFixed(1)} km`}
          </p>
          <div className="tags">
            {place.price.free ? (
              <span className="tag tag-free">Free</span>
            ) : (
              <span className="tag" title="Adult · Child">
                🧑 {adultPriceText(place) ?? '?'} · 👶 {childPriceText(place, months) ?? '?'}
              </span>
            )}
            <span className="tag">{settingLabel(place.setting)}</span>
            {parkingLabel(place) && <span className="tag">🅿️ {parkingLabel(place)}</span>}
            {place.facilities.stroller && <span className="tag" title="Stroller friendly">🚼</span>}
            {place.facilities.changingTable && <span className="tag" title="Changing table">🧷</span>}
            {place.facilities.feedingRoom && <span className="tag" title="Feeding room">🍼</span>}
          </div>
        </div>
      </Link>
      <button
        className={`icon-btn fav-btn ${fav ? 'active' : ''}`}
        onClick={() => favorites.toggle(place.id)}
        aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={fav}
      >
        {fav ? '♥' : '♡'}
      </button>
    </article>
  )
}
