import {
  Accessibility,
  ArrowLeft,
  Baby,
  Bookmark,
  Bus,
  Car,
  Check,
  ChevronRight,
  Clock,
  Coffee,
  Globe,
  Heart,
  HelpCircle,
  Lightbulb,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Tag,
  Timer,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PlaceImage } from '../components/ui'
import { adultPriceText, CATEGORY_LABEL, childPriceText, estimatedAdultText, estimatedChildText, fitsAge, formatAge, placeById } from '../lib/places'
import { KEYS, useIdList, useNotes, useStored } from '../lib/storage'
import { useChild } from '../lib/useChild'
import type { Facilities, Place, Visit } from '../types'

const NO_VISITS: Visit[] = []

const FACILITIES: { key: keyof Facilities; label: string; Icon: LucideIcon }[] = [
  { key: 'stroller', label: 'Stroller friendly', Icon: Accessibility },
  { key: 'changingTable', label: 'Changing table', Icon: Baby },
  { key: 'feedingRoom', label: 'Feeding room', Icon: Heart },
  { key: 'cafe', label: 'Café', Icon: Coffee },
  { key: 'toilet', label: 'Toilet', Icon: Users },
  { key: 'parking', label: 'Parking', Icon: Car },
]

const euro = (n: number | null) => (n === null ? '—' : n === 0 ? 'Free' : `€${Number.isInteger(n) ? n : n.toFixed(2)}`)
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

function parkingSummary(p: Place): { title: string; tone: 'good' | 'neutral' | 'bad' } | null {
  const info = p.parkingInfo
  if (!info || info.available === null) return null
  if (!info.available) return { title: 'No parking on site', tone: 'bad' }
  if (info.cost === 'free') return { title: 'Free parking', tone: 'good' }
  if (info.cost === 'mixed') return { title: 'Free and paid parking', tone: 'good' }
  if (info.cost === 'paid') return { title: 'Paid parking', tone: 'neutral' }
  return { title: 'Parking available', tone: 'neutral' }
}

export function PlaceDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const place = placeById(id)
  const { months } = useChild()
  const favorites = useIdList(KEYS.favorites)
  const wishlist = useIdList(KEYS.wishlist)
  const { notes, setNote } = useNotes()
  const [visits, setVisits] = useStored<Visit[]>(KEYS.visits, NO_VISITS)
  const [visitNote, setVisitNote] = useState('')
  const [logged, setLogged] = useState(false)
  const [slide, setSlide] = useState(0)

  if (!place) {
    return (
      <div className="page">
        <p>Place not found.</p>
        <Link to="/explore">Back to Explore</Link>
      </div>
    )
  }

  const photos = place.photos ?? []
  const fav = favorites.has(place.id)
  const myVisits = visits.filter((v) => v.placeId === place.id)
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=transit`
  const ageText =
    place.ageMinMonths === 0 && place.ageMaxMonths >= 144 ? 'All ages' : `${formatAge(place.ageMinMonths)}–${formatAge(place.ageMaxMonths)}`
  const duration = place.durationMinutes >= 60 ? `${Math.round((place.durationMinutes / 60) * 10) / 10} h` : `${place.durationMinutes} min`
  const adult = adultPriceText(place)
  const child = childPriceText(place, months)
  const adultEst = estimatedAdultText(place)
  const childEst = estimatedChildText(place, months)
  const parking = parkingSummary(place)

  const logVisit = () => {
    const visit: Visit = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      placeId: place.id,
      date: new Date().toISOString().slice(0, 10),
      note: visitNote.trim(),
    }
    setVisits([visit, ...visits])
    setVisitNote('')
    setLogged(true)
  }

  return (
    <div className="detail">
      <div className="detail-media">
        {photos.length ? (
          <div
            className="detail-gallery"
            onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          >
            {photos.map((ph) => (
              <figure key={ph.src}>
                <PlaceImage photo={ph} category={place.category} />
                <figcaption>
                  <a href={ph.page} target="_blank" rel="noreferrer">
                    Photo: {ph.credit}
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <PlaceImage category={place.category} className="detail-fallback" />
        )}
        <button className="float-button left" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/explore'))} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <button className={`float-button right ${fav ? 'on' : ''}`} onClick={() => favorites.toggle(place.id)} aria-label={fav ? 'Remove from saved' : 'Save'}>
          <Heart size={20} fill={fav ? 'currentColor' : 'none'} />
        </button>
        {photos.length > 1 && (
          <span className="photo-count">
            {slide + 1} / {photos.length}
          </span>
        )}
      </div>

      <div className="detail-body">
        <header className="detail-header">
          <p className="overline">
            {CATEGORY_LABEL[place.category].label} · {place.area}
          </p>
          <h1>{place.name}</h1>
          {place.nameLocal && place.nameLocal !== place.name && <p className="muted">{place.nameLocal}</p>}
        </header>

        <section className="price-panel">
          <div>
            <span>Adult</span>
            <strong className={adult === null && adultEst ? 'estimate' : ''}>{adult ?? adultEst ?? '—'}</strong>
          </div>
          <div>
            <span>Child{months !== null ? ` · ${formatAge(months)}` : ''}</span>
            <strong className={child === null && childEst ? 'estimate' : ''}>{child ?? childEst ?? '—'}</strong>
          </div>
          {(adult === null || child === null) && (
            <p className="price-warning">
              {(adult === null && adultEst) || (child === null && childEst)
                ? '≈ is a typical price for similar places in Tallinn, not this place’s official price. '
                : 'Price not published. '}
              {place.phone ? <a href={telHref(place.phone)}>Call to confirm</a> : <a href={place.website} target="_blank" rel="noreferrer">Check website</a>}
            </p>
          )}
        </section>

        <div className="facts">
          <div>
            <Baby size={18} />
            <span>{ageText}</span>
            {months !== null && !fitsAge(place, months) && <small className="warn">Not ideal for your child</small>}
          </div>
          <div>
            <Timer size={18} />
            <span>About {duration}</span>
          </div>
          <div>
            <MapPin size={18} />
            <span>{place.setting === 'indoor' ? 'Indoor' : place.setting === 'outdoor' ? 'Outdoor' : 'Indoor & outdoor'}</span>
          </div>
          <div>
            <Car size={18} />
            <span>{parking?.title ?? 'Parking unknown'}</span>
          </div>
        </div>

        <p className="lead">{place.description}</p>

        {place.tips && (
          <aside className="callout">
            <Lightbulb size={18} />
            <p>{place.tips}</p>
          </aside>
        )}

        <section className="block">
          <h2>Contact & location</h2>
          <ul className="list-card">
            {place.phone && (
              <li>
                <a className="row" href={telHref(place.phone)}>
                  <Phone size={18} className="row-icon" />
                  <span className="row-text">
                    <strong>{place.phone}</strong>
                    <small>Call</small>
                  </span>
                  <ChevronRight size={18} className="muted" />
                </a>
              </li>
            )}
            {place.email && (
              <li>
                <a className="row" href={`mailto:${place.email}`}>
                  <Mail size={18} className="row-icon" />
                  <span className="row-text">
                    <strong>{place.email}</strong>
                    <small>Email</small>
                  </span>
                  <ChevronRight size={18} className="muted" />
                </a>
              </li>
            )}
            <li>
              <a className="row" href={place.website} target="_blank" rel="noreferrer">
                <Globe size={18} className="row-icon" />
                <span className="row-text">
                  <strong>{new URL(place.website).host.replace(/^www\./, '')}</strong>
                  <small>Website</small>
                </span>
                <ChevronRight size={18} className="muted" />
              </a>
            </li>
            <li>
              <a className="row" href={directions} target="_blank" rel="noreferrer">
                <MapPin size={18} className="row-icon" />
                <span className="row-text">
                  <strong>{place.address}</strong>
                  <small>{place.transport ? place.transport : 'Open in maps'}</small>
                </span>
                <ChevronRight size={18} className="muted" />
              </a>
            </li>
            <li className="row static">
              <Clock size={18} className="row-icon" />
              <span className="row-text">
                <strong>Opening hours</strong>
                <small>{place.hours}</small>
              </span>
            </li>
          </ul>
        </section>

        {!place.price.free && (place.price.family !== null || place.price.note || place.price.childFreeUnderMonths !== null) && (
          <section className="block">
            <h2>All prices</h2>
            <dl className="kv">
              <div>
                <dt>Adult</dt>
                <dd>{euro(place.price.adult)}</dd>
              </div>
              <div>
                <dt>Child</dt>
                <dd>{euro(place.price.child)}</dd>
              </div>
              {place.price.family !== null && (
                <div>
                  <dt>Family ticket</dt>
                  <dd>{euro(place.price.family)}</dd>
                </div>
              )}
              {place.price.childFreeUnderMonths !== null && (
                <div>
                  <dt>Free for children under</dt>
                  <dd>{formatAge(place.price.childFreeUnderMonths)}</dd>
                </div>
              )}
            </dl>
            {place.price.note && <p className="small muted">{place.price.note}</p>}
          </section>
        )}

        {place.discounts.length > 0 && (
          <section className="block">
            <h2>Discounts & free days</h2>
            <ul className="bullets">
              {place.discounts.map((d) => (
                <li key={d}>
                  <Tag size={16} /> {d}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="block">
          <h2>For parents</h2>
          <ul className="amenities">
            {FACILITIES.map(({ key, label, Icon }) => {
              const v = place.facilities[key]
              const StateIcon = v === true ? Check : v === false ? X : HelpCircle
              return (
                <li key={key} className={v === true ? 'yes' : v === false ? 'no' : 'unknown'}>
                  <Icon size={18} />
                  <span>{label}</span>
                  <StateIcon size={16} className="state" aria-label={v === true ? 'Yes' : v === false ? 'No' : 'Unknown'} />
                </li>
              )
            })}
          </ul>
        </section>

        {parking && (
          <section className="block">
            <h2>Parking</h2>
            <div className="list-card padded">
              <span className={`status ${parking.tone}`}>{parking.title}</span>
              {place.parkingInfo?.operator && <p className="small">Operator: {place.parkingInfo.operator}</p>}
              {place.parkingInfo?.zone && <p className="small">City zone: {place.parkingInfo.zone}</p>}
              {place.parkingInfo?.available && place.parkingInfo.cost !== 'free' && (
                <p className="small">
                  {place.parkingInfo.pargiSupported === true
                    ? '✓ You can pay with Pargi.ee'
                    : place.parkingInfo.pargiSupported === false
                      ? 'Pargi.ee not supported — use the operator’s app or machine'
                      : 'Pargi.ee support unknown'}
                </p>
              )}
              {place.parkingInfo?.note && <p className="small muted">{place.parkingInfo.note}</p>}
            </div>
          </section>
        )}

        {place.transport && (
          <section className="block">
            <h2>Public transport</h2>
            <p className="with-icon">
              <Bus size={18} /> {place.transport}
            </p>
          </section>
        )}

        <section className="block">
          <h2>Your notes</h2>
          <textarea
            rows={3}
            placeholder="e.g. Go before 11 — it gets busy after."
            value={notes[place.id] ?? ''}
            onChange={(e) => setNote(place.id, e.target.value)}
          />
          <div className="visit-row">
            <input type="text" placeholder="A moment to remember (optional)" value={visitNote} onChange={(e) => setVisitNote(e.target.value)} />
            <button className="button secondary" onClick={logVisit}>
              We went today
            </button>
          </div>
          {logged && <p className="small ok">Saved to your moments</p>}
          {myVisits.length > 0 && (
            <ul className="bullets small">
              {myVisits.map((v) => (
                <li key={v.id}>
                  {v.date}
                  {v.note && ` — ${v.note}`}
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="verify">
          {place.lastVerified ? `Information checked ${place.lastVerified}. ` : 'Information not yet verified. '}
          Prices and hours can change, so check the{' '}
          <a href={place.website} target="_blank" rel="noreferrer">
            official website
          </a>{' '}
          before you go.
          {place.sources && place.sources.length > 0 && (
            <details>
              <summary>Sources</summary>
              <ul>
                {place.sources.map((u) => (
                  <li key={u}>
                    <a href={u} target="_blank" rel="noreferrer">
                      {u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </footer>
      </div>

      <div className="action-bar">
        <button className={`button icon-only ${wishlist.has(place.id) ? 'on' : ''}`} onClick={() => wishlist.toggle(place.id)} aria-label="Want to go">
          <Bookmark size={20} fill={wishlist.has(place.id) ? 'currentColor' : 'none'} />
        </button>
        {place.phone ? (
          <a className="button secondary" href={telHref(place.phone)}>
            <Phone size={18} /> Call
          </a>
        ) : (
          <a className="button secondary" href={place.website} target="_blank" rel="noreferrer">
            <Globe size={18} /> Website
          </a>
        )}
        <a className="button primary" href={directions} target="_blank" rel="noreferrer">
          <Navigation size={18} /> Directions
        </a>
      </div>
    </div>
  )
}
