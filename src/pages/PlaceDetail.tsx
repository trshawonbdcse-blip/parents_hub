import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CATEGORY_LABEL, fitsAge, formatAge, placeById, priceLabel, settingLabel } from '../lib/places'
import { KEYS, useIdList, useNotes, useStored } from '../lib/storage'
import { useChild } from '../lib/useChild'
import type { Facilities, Visit } from '../types'

const NO_VISITS: Visit[] = []

const FACILITY_LABELS: { key: keyof Facilities; label: string; icon: string }[] = [
  { key: 'stroller', label: 'Stroller friendly', icon: '🚼' },
  { key: 'changingTable', label: 'Changing table', icon: '🧷' },
  { key: 'feedingRoom', label: 'Feeding room', icon: '🍼' },
  { key: 'cafe', label: 'Café', icon: '☕' },
  { key: 'toilet', label: 'Toilet', icon: '🚻' },
  { key: 'parking', label: 'Parking', icon: '🅿️' },
]

const euro = (n: number | null) => (n === null ? '—' : n === 0 ? 'Free' : `€${Number.isInteger(n) ? n : n.toFixed(2)}`)

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

  if (!place) {
    return (
      <div className="page">
        <p>Place not found.</p>
        <Link to="/explore">Back to Explore</Link>
      </div>
    )
  }

  const cat = CATEGORY_LABEL[place.category]
  const myVisits = visits.filter((v) => v.placeId === place.id)
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=transit`
  const ageText =
    place.ageMinMonths === 0 && place.ageMaxMonths >= 144
      ? 'All ages'
      : `${formatAge(place.ageMinMonths)} – ${formatAge(place.ageMaxMonths)}`

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
    <div className="page detail">
      <button className="back" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/explore'))}>
        ← Back
      </button>

      <div className={`hero cat-${place.category}`} aria-hidden="true">
        {cat.emoji}
      </div>

      <header>
        <p className="eyebrow">
          {cat.label} · {place.area}
        </p>
        <h1>{place.name}</h1>
        {place.nameLocal && place.nameLocal !== place.name && <p className="muted">{place.nameLocal}</p>}
        <p>{place.description}</p>
      </header>

      <div className="actions">
        <button className={`btn ${favorites.has(place.id) ? 'btn-on' : ''}`} onClick={() => favorites.toggle(place.id)}>
          {favorites.has(place.id) ? '♥ Favorite' : '♡ Favorite'}
        </button>
        <button className={`btn ${wishlist.has(place.id) ? 'btn-on' : ''}`} onClick={() => wishlist.toggle(place.id)}>
          {wishlist.has(place.id) ? '✓ Want to go' : '+ Want to go'}
        </button>
        <a className="btn btn-primary" href={directions} target="_blank" rel="noreferrer">
          🧭 Directions
        </a>
      </div>

      <section className="card glance">
        <div>
          <span className="eyebrow">Price</span>
          <strong>{priceLabel(place, months)}</strong>
        </div>
        <div>
          <span className="eyebrow">Age</span>
          <strong>{ageText}</strong>
          {months !== null && !fitsAge(place, months) && <span className="small warn">Not ideal for your child's age</span>}
        </div>
        <div>
          <span className="eyebrow">Time needed</span>
          <strong>~{place.durationMinutes >= 60 ? `${Math.round(place.durationMinutes / 60 * 10) / 10} h` : `${place.durationMinutes} min`}</strong>
        </div>
        <div>
          <span className="eyebrow">Type</span>
          <strong>{settingLabel(place.setting)}</strong>
        </div>
      </section>

      {place.tips && (
        <section className="card tip">
          <p className="eyebrow">💡 Parent tip</p>
          <p>{place.tips}</p>
        </section>
      )}

      <section>
        <h2>Opening hours</h2>
        <p>{place.hours}</p>
      </section>

      {!place.price.free && (
        <section>
          <h2>Prices</h2>
          <table className="price-table">
            <tbody>
              <tr>
                <td>Adult</td>
                <td>{euro(place.price.adult)}</td>
              </tr>
              <tr>
                <td>Child</td>
                <td>{euro(place.price.child)}</td>
              </tr>
              {place.price.family !== null && (
                <tr>
                  <td>Family ticket</td>
                  <td>{euro(place.price.family)}</td>
                </tr>
              )}
              {place.price.childFreeUnderMonths !== null && (
                <tr>
                  <td>Free for children under</td>
                  <td>{formatAge(place.price.childFreeUnderMonths)}</td>
                </tr>
              )}
            </tbody>
          </table>
          {place.price.note && <p className="small muted">{place.price.note}</p>}
        </section>
      )}

      {place.discounts.length > 0 && (
        <section>
          <h2>Discounts & free days</h2>
          <ul className="list">
            {place.discounts.map((d) => (
              <li key={d}>🏷️ {d}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>For parents</h2>
        <ul className="facilities">
          {FACILITY_LABELS.map((f) => {
            const v = place.facilities[f.key]
            return (
              <li key={f.key} className={v === true ? 'yes' : v === false ? 'no' : 'unknown'}>
                <span aria-hidden="true">{f.icon}</span> {f.label}
                <span className="small">{v === true ? 'Yes' : v === false ? 'No' : 'Unknown'}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2>Parking</h2>
        {place.parkingInfo && place.parkingInfo.available !== null ? (
          <div className="card stack-sm">
            <p>
              <strong>
                {!place.parkingInfo.available
                  ? '🚫 No parking on site'
                  : place.parkingInfo.cost === 'free'
                    ? '🅿️ Free parking'
                    : place.parkingInfo.cost === 'mixed'
                      ? '🅿️ Free and paid options'
                      : place.parkingInfo.cost === 'paid'
                        ? '🅿️ Paid parking'
                        : '🅿️ Parking available'}
              </strong>
            </p>
            {place.parkingInfo.operator && <p className="small">Operator: {place.parkingInfo.operator}</p>}
            {place.parkingInfo.zone && <p className="small">City zone: {place.parkingInfo.zone}</p>}
            {place.parkingInfo.available && place.parkingInfo.cost !== 'free' && (
              <p className="small">
                {place.parkingInfo.pargiSupported === true ? (
                  <span className="tag pargi">✓ Pay with Pargi.ee</span>
                ) : place.parkingInfo.pargiSupported === false ? (
                  <span className="tag">✗ Pargi.ee not supported — use the operator's app/machine</span>
                ) : (
                  <span className="tag">Pargi.ee support unknown</span>
                )}
              </p>
            )}
            {place.parkingInfo.note && <p className="small muted">{place.parkingInfo.note}</p>}
          </div>
        ) : (
          <p className="small muted">No parking info yet.</p>
        )}
      </section>

      <section>
        <h2>Getting there</h2>
        <p>{place.address}</p>
        {place.transport && <p className="small">🚌 {place.transport}</p>}
        {place.language && <p className="small">🗣️ {place.language}</p>}
      </section>

      <section className="card">
        <h2>Our notes</h2>
        <textarea
          rows={3}
          placeholder="e.g. Go before 11 — gets busy after."
          value={notes[place.id] ?? ''}
          onChange={(e) => setNote(place.id, e.target.value)}
        />
      </section>

      <section className="card">
        <h2>We went here 🎉</h2>
        <input
          type="text"
          placeholder="A moment to remember (optional)"
          value={visitNote}
          onChange={(e) => setVisitNote(e.target.value)}
        />
        <button className="btn btn-primary full" onClick={logVisit}>
          Save today's visit
        </button>
        {logged && <p className="small ok">Saved to your moments ♥</p>}
        {myVisits.length > 0 && (
          <ul className="list small">
            {myVisits.map((v) => (
              <li key={v.id}>
                {v.date}
                {v.note && ` — ${v.note}`}
              </li>
            ))}
          </ul>
        )}
      </section>

      {place.sources && place.sources.length > 0 && (
        <details className="small">
          <summary>Sources ({place.sources.length})</summary>
          <ul className="list">
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

      <footer className="verify small muted">
        {place.lastVerified ? `Info last checked ${place.lastVerified}. ` : 'Info not yet verified. '}
        {place.confidence === 'low' && 'Some details may be incomplete. '}
        Prices and hours can change —{' '}
        <a href={place.website} target="_blank" rel="noreferrer">
          check the official website ↗
        </a>
      </footer>
    </div>
  )
}
