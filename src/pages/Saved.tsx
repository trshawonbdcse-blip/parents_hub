import { Bookmark, Heart, Sparkles, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PlaceRow } from '../components/PlaceRow'
import { PlaceImage } from '../components/ui'
import { useAllPlaces } from '../lib/osm'
import { KEYS, useIdList, useStored } from '../lib/storage'
import { useChild } from '../lib/useChild'
import type { Place, Visit } from '../types'
import { useT } from '../lib/i18n'

const NO_VISITS: Visit[] = []


// Favourites + want-to-go lists, or the moments diary (shown inside the Me page).
export function Saved({ view }: { view: 'saved' | 'moments' }) {
  const { t, locale } = useT()
  const dateFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'long' })
  const { months } = useChild()
  const favorites = useIdList(KEYS.favorites)
  const wishlist = useIdList(KEYS.wishlist)
  const [visits, setVisits] = useStored<Visit[]>(KEYS.visits, NO_VISITS)
  const all = useAllPlaces()
  const placeById = (id: string) => all.find((p) => p.id === id)
  const resolve = (ids: string[]) => ids.map(placeById).filter((p): p is Place => Boolean(p))

  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthVisits = visits.filter((v) => v.date.startsWith(thisMonth))
  const monthPlaces = new Set(monthVisits.map((v) => v.placeId))

  const section = (title: string, ids: string[], empty: string, Icon: typeof Heart) => (
    <section>
      <h2 className="list-head">
        {title} <span className="count">{ids.length}</span>
      </h2>
      {ids.length > 0 ? (
        <div className="row-list">
          {resolve(ids).map((p) => (
            <PlaceRow key={p.id} place={p} months={months} />
          ))}
        </div>
      ) : (
        <p className="empty-line">
          <Icon size={18} /> {empty}
        </p>
      )}
    </section>
  )

  return (
    <>
      {view === 'saved' && (
        <>
          {section(t('Favourites'), favorites.ids, t('Tap the heart on any place to keep it here.'), Heart)}
          {section(t('Want to go'), wishlist.ids, t('Tap the bookmark on a place you want to try.'), Bookmark)}
          {favorites.ids.length + wishlist.ids.length === 0 && (
            <Link to="/explore" className="button primary">
              {t('Explore places')}
            </Link>
          )}
        </>
      )}

      {view === 'moments' && (
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
    </>
  )
}
