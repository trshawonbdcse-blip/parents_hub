import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlaceCard } from '../components/PlaceCard'
import { placeById } from '../lib/places'
import { KEYS, useIdList, useStored } from '../lib/storage'
import { useChild } from '../lib/useChild'
import type { Place, Visit } from '../types'

const NO_VISITS: Visit[] = []
type Tab = 'favorites' | 'wishlist' | 'moments'

const resolve = (ids: string[]) => ids.map(placeById).filter((p): p is Place => Boolean(p))

export function Saved() {
  const [tab, setTab] = useState<Tab>('favorites')
  const { months } = useChild()
  const favorites = useIdList(KEYS.favorites)
  const wishlist = useIdList(KEYS.wishlist)
  const [visits, setVisits] = useStored<Visit[]>(KEYS.visits, NO_VISITS)

  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthVisits = visits.filter((v) => v.date.startsWith(thisMonth))
  const monthPlaces = new Set(monthVisits.map((v) => v.placeId))

  return (
    <div className="page">
      <header className="page-header">
        <h1>Saved</h1>
      </header>

      <div className="tabs" role="tablist">
        {(
          [
            ['favorites', `♥ Favorites (${favorites.ids.length})`],
            ['wishlist', `Want to go (${wishlist.ids.length})`],
            ['moments', `Moments (${visits.length})`],
          ] as const
        ).map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab !== 'moments' && (
        <div className="stack">
          {resolve(tab === 'favorites' ? favorites.ids : wishlist.ids).map((p) => (
            <PlaceCard key={p.id} place={p} months={months} />
          ))}
          {(tab === 'favorites' ? favorites.ids : wishlist.ids).length === 0 && (
            <p className="muted">
              Nothing here yet. <Link to="/explore">Explore places</Link> and tap ♡ or “Want to go”.
            </p>
          )}
        </div>
      )}

      {tab === 'moments' && (
        <>
          <section className="card summary">
            <p className="eyebrow">This month</p>
            <strong className="big">{monthVisits.length}</strong> outings ·{' '}
            <strong className="big">{monthPlaces.size}</strong> places
          </section>
          <ul className="timeline">
            {visits.map((v) => {
              const p = placeById(v.placeId)
              return (
                <li key={v.id}>
                  <span className="small muted">{v.date}</span>
                  <Link to={`/place/${v.placeId}`}>{p?.name ?? 'Unknown place'}</Link>
                  {v.note && <p className="small">“{v.note}”</p>}
                  <button
                    className="link-btn small"
                    onClick={() => confirm('Delete this moment?') && setVisits(visits.filter((x) => x.id !== v.id))}
                  >
                    Delete
                  </button>
                </li>
              )
            })}
          </ul>
          {visits.length === 0 && (
            <p className="muted">After an outing, open the place and tap “Save today's visit” to remember it here.</p>
          )}
        </>
      )}
    </div>
  )
}
