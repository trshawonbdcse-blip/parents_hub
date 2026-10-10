import { Bookmark, Heart, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlaceCard } from '../components/PlaceCard'
import { PlaceImage } from '../components/ui'
import { placeById } from '../lib/places'
import { KEYS, useIdList, useStored } from '../lib/storage'
import { useChild } from '../lib/useChild'
import type { Place, Visit } from '../types'
import { useT } from '../lib/i18n'

const NO_VISITS: Visit[] = []
type Tab = 'favorites' | 'wishlist' | 'moments'

const resolve = (ids: string[]) => ids.map(placeById).filter((p): p is Place => Boolean(p))

export function Saved() {
  const { t, locale } = useT()
  const dateFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'long' })
  const [tab, setTab] = useState<Tab>('favorites')
  const { months } = useChild()
  const favorites = useIdList(KEYS.favorites)
  const wishlist = useIdList(KEYS.wishlist)
  const [visits, setVisits] = useStored<Visit[]>(KEYS.visits, NO_VISITS)

  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthVisits = visits.filter((v) => v.date.startsWith(thisMonth))
  const monthPlaces = new Set(monthVisits.map((v) => v.placeId))
  const list = tab === 'favorites' ? favorites.ids : wishlist.ids

  return (
    <div className="page">
      <h1 className="page-title">{t('Saved')}</h1>

      <div className="segmented wide" role="tablist">
        {(
          [
            ['favorites', 'Favourites', favorites.ids.length],
            ['wishlist', 'Want to go', wishlist.ids.length],
            ['moments', 'Moments', visits.length],
          ] as const
        ).map(([key, label, n]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
            {t(label)} <span className="count">{n}</span>
          </button>
        ))}
      </div>

      {tab !== 'moments' && (
        <>
          <div className="card-grid">
            {resolve(list).map((p) => (
              <PlaceCard key={p.id} place={p} months={months} />
            ))}
          </div>
          {list.length === 0 && (
            <div className="empty">
              {tab === 'favorites' ? <Heart size={32} /> : <Bookmark size={32} />}
              <p>{tab === 'favorites' ? t('Tap the heart on any place to keep it here.') : t('Tap the bookmark on a place you want to try.')}</p>
              <Link to="/explore" className="button primary">
                {t('Explore places')}
              </Link>
            </div>
          )}
        </>
      )}

      {tab === 'moments' && (
        <>
          <section className="stats">
            <div>
              <strong>{monthVisits.length}</strong>
              <span>{t('outings this month')}</span>
            </div>
            <div>
              <strong>{monthPlaces.size}</strong>
              <span>{t('different places')}</span>
            </div>
          </section>
          <ul className="moments">
            {visits.map((v) => {
              const p = placeById(v.placeId)
              return (
                <li key={v.id}>
                  <Link to={`/place/${v.placeId}`} className="moment-media">
                    {p && <PlaceImage photo={p.photos?.[0]} category={p.category} />}
                  </Link>
                  <div className="moment-text">
                    <small>{dateFmt.format(new Date(v.date))}</small>
                    <strong>{p?.name ?? t('Unknown place')}</strong>
                    {v.note && <p>“{v.note}”</p>}
                  </div>
                  <button
                    className="icon-button plain"
                    aria-label={t('Delete moment')}
                    onClick={() => confirm(t('Delete this moment?')) && setVisits(visits.filter((x) => x.id !== v.id))}
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              )
            })}
          </ul>
          {visits.length === 0 && (
            <div className="empty">
              <Sparkles size={32} />
              <p>{t('After an outing, open the place and tap “We went today” to remember it here.')}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
