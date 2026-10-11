import {
  Accessibility,
  BadgeCheck,
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
  Share2,
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
import { adultPriceText, categoryLabel, childPriceText, estimatedAdultText, estimatedChildText, fitsAge, formatAge } from '../lib/places'
import { KEYS, useIdList, useNotes, useStored } from '../lib/storage'
import { useChild } from '../lib/useChild'
import type { Facilities, Place, Visit } from '../types'
import { translate as tr, useT } from '../lib/i18n'
import { placeText } from '../lib/placeText'
import { usePlace } from '../lib/osm'
import { shareContent, shareUrl } from '../lib/native'
import { stebbyInfo, useStebby } from '../lib/stebby'

const NO_VISITS: Visit[] = []

const FACILITIES: { key: keyof Facilities; label: string; Icon: LucideIcon }[] = [
  { key: 'stroller', label: 'Stroller friendly', Icon: Accessibility },
  { key: 'changingTable', label: 'Changing table', Icon: Baby },
  { key: 'feedingRoom', label: 'Feeding room', Icon: Heart },
  { key: 'cafe', label: 'Café', Icon: Coffee },
  { key: 'toilet', label: 'Toilet', Icon: Users },
  { key: 'parking', label: 'Parking', Icon: Car },
]

const euro = (n: number | null) => (n === null ? '—' : n === 0 ? tr('Free') : `€${Number.isInteger(n) ? n : n.toFixed(2)}`)
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

function parkingSummary(p: Place): { title: string; tone: 'good' | 'neutral' | 'bad' } | null {
  const info = p.parkingInfo
  if (!info || info.available === null) return null
  if (!info.available) return { title: tr('No parking on site'), tone: 'bad' }
  if (info.cost === 'free') return { title: tr('Free parking'), tone: 'good' }
  if (info.cost === 'mixed') return { title: tr('Free and paid parking'), tone: 'good' }
  if (info.cost === 'paid') return { title: tr('Paid parking'), tone: 'neutral' }
  return { title: tr('Parking available'), tone: 'neutral' }
}

const hostOf = (url: string) => {
  try {
    return url ? new URL(url).host.replace(/^www\./, '') : null
  } catch {
    return null
  }
}

export function PlaceDetail() {
  const { t } = useT()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { place, loading } = usePlace(id)
  const { months } = useChild()
  const favorites = useIdList(KEYS.favorites)
  const wishlist = useIdList(KEYS.wishlist)
  const { notes, setNote } = useNotes()
  const [visits, setVisits] = useStored<Visit[]>(KEYS.visits, NO_VISITS)
  const [visitNote, setVisitNote] = useState('')
  const [logged, setLogged] = useState(false)
  const [slide, setSlide] = useState(0)
  const [hasStebby] = useStebby()

  if (!place && loading) return <div className="page"><p className="muted">{t('Loading…')}</p></div>
  if (!place) {
    return (
      <div className="page">
        <p>{t('Place not found.')}</p>
        <Link to="/explore">{t('Back to Explore')}</Link>
      </div>
    )
  }

  const text = placeText(place)
  const stebby = stebbyInfo(place)
  const photos = place.photos ?? []
  const fav = favorites.has(place.id)
  const myVisits = visits.filter((v) => v.placeId === place.id)
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=transit`
  const ageText =
    place.ageMinMonths === 0 && place.ageMaxMonths >= 144 ? tr('All ages') : `${formatAge(place.ageMinMonths)}–${formatAge(place.ageMaxMonths)}`
  const duration = place.durationMinutes >= 60 ? t('{n} h', { n: Math.round((place.durationMinutes / 60) * 10) / 10 }) : t('{n} min', { n: place.durationMinutes })
  const adult = adultPriceText(place)
  const child = childPriceText(place, months)
  const adultEst = estimatedAdultText(place)
  const childEst = estimatedChildText(place, months)
  const parking = parkingSummary(place)

  const share = async () => {
    try {
      await shareContent({ title: place.name, text: `${place.name} — ${place.address}`, url: shareUrl(`/place/${place.id}`) })
    } catch {
      // User cancelled the share sheet.
    }
  }

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
                <figcaption>{t('Photo: {credit}', { credit: ph.credit })}</figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <PlaceImage category={place.category} className="detail-fallback" />
        )}
        <button className="float-button left" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/explore'))} aria-label={t('Back')}>
          <ArrowLeft size={20} />
        </button>
        <button className={`float-button right ${fav ? 'on' : ''}`} onClick={() => favorites.toggle(place.id)} aria-label={fav ? t('Remove from saved') : t('Save')}>
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
            {categoryLabel(place.category)} · {place.area === place.city || place.city === 'Tallinn' ? place.area : `${place.area}, ${place.city}`}
          </p>
          <h1>{place.name}</h1>
          {place.nameLocal && place.nameLocal !== place.name && <p className="muted">{place.nameLocal}</p>}
        </header>

        <section className="price-panel">
          <div>
            <span>{t('Adult')}</span>
            <strong className={adult === null && adultEst ? 'estimate' : ''}>{adult ?? adultEst ?? '—'}</strong>
          </div>
          <div>
            <span>{t('Child')}{months !== null ? ` · ${formatAge(months)}` : ''}</span>
            <strong className={child === null && childEst ? 'estimate' : ''}>{child ?? childEst ?? '—'}</strong>
          </div>
          {(adult === null || child === null) && (
            <p className="price-warning">
              {(adult === null && adultEst) || (child === null && childEst)
                ? t('≈ is a typical price for similar places in Estonia, not this place’s official price.') + ' '
                : t('Price not published.') + ' '}
              {place.phone ? <a href={telHref(place.phone)}>{t('Call to confirm')}</a> : t('Confirm at the entrance.')}
            </p>
          )}
        </section>

        {(stebby || (hasStebby && !place.price.free)) && (
          <div className={`stebby-row ${stebby ? '' : 'no'}`}>
            {stebby ? <BadgeCheck size={18} /> : <HelpCircle size={18} />}
            <div>
              <strong>{stebby ? t('Stebby accepted') : stebby === false ? t('Not found among Stebby partners') : t('Stebby: not checked yet')}</strong>
              <p>
                {stebby
                  ? t('Pay from your Stebby balance in the Stebby app at the venue.') + ` (${stebby.name})`
                  : t('Ask at the entrance or check in the Stebby app.')}
              </p>
            </div>
          </div>
        )}

        <div className="facts">
          <div>
            <Baby size={18} />
            <span>{ageText}</span>
            {months !== null && !fitsAge(place, months) && <small className="warn">{t('Not ideal for your child')}</small>}
          </div>
          <div>
            <Timer size={18} />
            <span>{t('About {d}', { d: duration })}</span>
          </div>
          <div>
            <MapPin size={18} />
            <span>{t(place.setting === 'indoor' ? 'Indoor' : place.setting === 'outdoor' ? 'Outdoor' : 'Indoor & outdoor')}</span>
          </div>
          <div>
            <Car size={18} />
            <span>{parking?.title ?? t('Parking unknown')}</span>
          </div>
        </div>

        <p className="lead">{text.description}</p>

        {text.tips && (
          <aside className="callout">
            <Lightbulb size={18} />
            <p>{text.tips}</p>
          </aside>
        )}

        <section className="block">
          <h2>{t('Contact & location')}</h2>
          <ul className="list-card">
            {place.phone && (
              <li>
                <a className="row" href={telHref(place.phone)}>
                  <Phone size={18} className="row-icon" />
                  <span className="row-text">
                    <strong>{place.phone}</strong>
                    <small>{t('Call')}</small>
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
                    <small>{t('Email')}</small>
                  </span>
                  <ChevronRight size={18} className="muted" />
                </a>
              </li>
            )}
            {hostOf(place.website) && (
              <li>
                <a className="row" href={place.website} target="_blank" rel="noreferrer">
                  <Globe size={18} className="row-icon" />
                  <span className="row-text">
                    <strong>{hostOf(place.website)}</strong>
                    <small>{t('Website')}</small>
                  </span>
                  <ChevronRight size={18} className="muted" />
                </a>
              </li>
            )}
            <li>
              <a className="row" href={directions} target="_blank" rel="noreferrer">
                <MapPin size={18} className="row-icon" />
                <span className="row-text">
                  <strong>{place.address}</strong>
                  <small>{place.transport ? place.transport : t('Open in maps')}</small>
                </span>
                <ChevronRight size={18} className="muted" />
              </a>
            </li>
            <li className="row static">
              <Clock size={18} className="row-icon" />
              <span className="row-text">
                <strong>{t('Opening hours')}</strong>
                <small>{text.hours}</small>
              </span>
            </li>
          </ul>
        </section>

        {!place.price.free && (place.price.family !== null || place.price.note || place.price.childFreeUnderMonths !== null) && (
          <section className="block">
            <h2>{t('All prices')}</h2>
            <dl className="kv">
              <div>
                <dt>{t('Adult')}</dt>
                <dd>{euro(place.price.adult)}</dd>
              </div>
              <div>
                <dt>{t('Child')}</dt>
                <dd>{euro(place.price.child)}</dd>
              </div>
              {place.price.family !== null && (
                <div>
                  <dt>{t('Family ticket')}</dt>
                  <dd>{euro(place.price.family)}</dd>
                </div>
              )}
              {place.price.childFreeUnderMonths !== null && (
                <div>
                  <dt>{t('Free for children under')}</dt>
                  <dd>{formatAge(place.price.childFreeUnderMonths)}</dd>
                </div>
              )}
            </dl>
            {text.priceNote && <p className="small muted">{text.priceNote}</p>}
          </section>
        )}

        {text.discounts.length > 0 && (
          <section className="block">
            <h2>{t('Discounts & free days')}</h2>
            <ul className="bullets">
              {text.discounts.map((d) => (
                <li key={d}>
                  <Tag size={16} /> {d}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="block">
          <h2>{t('For parents')}</h2>
          <ul className="amenities">
            {FACILITIES.map(({ key, label, Icon }) => {
              const v = place.facilities[key]
              const StateIcon = v === true ? Check : v === false ? X : HelpCircle
              return (
                <li key={key} className={v === true ? 'yes' : v === false ? 'no' : 'unknown'}>
                  <Icon size={18} />
                  <span>{t(label)}</span>
                  <StateIcon size={16} className="state" aria-label={v === true ? 'Yes' : v === false ? 'No' : 'Unknown'} />
                </li>
              )
            })}
          </ul>
        </section>

        {parking && (
          <section className="block">
            <h2>{t('Parking')}</h2>
            <div className="list-card padded">
              <span className={`status ${parking.tone}`}>{parking.title}</span>
              {place.parkingInfo?.operator && <p className="small">{t('Operator: {op}', { op: place.parkingInfo.operator })}</p>}
              {place.parkingInfo?.zone && <p className="small">{t('City zone: {zone}', { zone: place.parkingInfo.zone })}</p>}
              {place.parkingInfo?.available && place.parkingInfo.cost !== 'free' && (
                <p className="small">
                  {place.parkingInfo.pargiSupported === true
                    ? t('✓ You can pay with Pargi.ee')
                    : place.parkingInfo.pargiSupported === false
                      ? t('Pargi.ee not supported — use the operator’s app or machine')
                      : t('Pargi.ee support unknown')}
                </p>
              )}
              {text.parkingNote && <p className="small muted">{text.parkingNote}</p>}
            </div>
          </section>
        )}

        {place.transport && (
          <section className="block">
            <h2>{t('Public transport')}</h2>
            <p className="with-icon">
              <Bus size={18} /> {place.transport}
            </p>
          </section>
        )}

        <section className="block">
          <h2>{t('Your notes')}</h2>
          <textarea
            rows={3}
            placeholder={t('e.g. Go before 11 — it gets busy after.')}
            value={notes[place.id] ?? ''}
            onChange={(e) => setNote(place.id, e.target.value)}
          />
          <div className="visit-row">
            <input type="text" placeholder={t('A moment to remember (optional)')} value={visitNote} onChange={(e) => setVisitNote(e.target.value)} />
            <button className="button secondary" onClick={logVisit}>
              {t('We went today')}
            </button>
          </div>
          {logged && <p className="small ok">{t('Saved to your moments')}</p>}
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
          {place.lastVerified ? t('Information checked {date}.', { date: place.lastVerified }) + ' ' : t('Information not yet verified.') + ' '}
          {t(place.phone ? 'Prices and hours can change, so call ahead if you are unsure.' : 'Prices and hours can change.')}{' '}
          {place.osm && t('Map data © OpenStreetMap contributors.') + ' '}
          {hostOf(place.website) && (
            <>
              {t('Official site:')}{' '}
              <a href={place.website} target="_blank" rel="noreferrer">
                {hostOf(place.website)}
              </a>
            </>
          )}
          {place.sources && place.sources.length > 0 && (
            <details>
              <summary>{t('Sources')}</summary>
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
        <button className={`button icon-only ${wishlist.has(place.id) ? 'on' : ''}`} onClick={() => wishlist.toggle(place.id)} aria-label={t('Want to go')}>
          <Bookmark size={20} fill={wishlist.has(place.id) ? 'currentColor' : 'none'} />
        </button>
        {place.phone ? (
          <a className="button secondary" href={telHref(place.phone)}>
            <Phone size={18} /> {t('Call')}
          </a>
        ) : (
          <button className="button secondary" onClick={share}>
            <Share2 size={18} /> {t('Share')}
          </button>
        )}
        <a className="button primary" href={directions} target="_blank" rel="noreferrer">
          <Navigation size={18} /> {t('Directions')}
        </a>
      </div>
    </div>
  )
}
