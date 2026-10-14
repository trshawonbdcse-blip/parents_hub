import { ChevronRight, CreditCard, Ticket } from 'lucide-react'
import { useT } from '../lib/i18n'
import { TALLINN_CARD, TALLINN_CARD_URL, toursUrl, withTallinnCard } from '../lib/visit'
import type { Place } from '../types'

// "Visiting" mode on a place page: Tallinn Card and tours. Booking links are affiliate links
// (only when configured) and always labelled.
export function TripHelp({ place }: { place: Place }) {
  const { t } = useT()
  const card = withTallinnCard(place)
  const tours = ['sight', 'museum', 'viewpoint', 'nature'].includes(place.category) ? toursUrl(`${place.name} ${place.city}`) : null
  const cardLink = toursUrl('Tallinn Card') ?? TALLINN_CARD_URL
  if (!card && !tours) return null
  return (
    <section className="block trip-help">
      <h2>{t('Make it easier')}</h2>
      <ul className="list-card">
        {card && (
          <li>
            <a className="row" href={cardLink} target="_blank" rel="noreferrer">
              <CreditCard size={18} className="row-icon" aria-hidden="true" />
              <span className="row-text">
                <strong>{t('Free with the Tallinn Card')}</strong>
                <small>{t('From €{price} for 24 h, with public transport and 40+ museums', { price: TALLINN_CARD[1] })}</small>
              </span>
              <ChevronRight size={18} className="muted" />
            </a>
          </li>
        )}
        {tours && (
          <li>
            <a className="row" href={tours} target="_blank" rel="noreferrer sponsored">
              <Ticket size={18} className="row-icon" aria-hidden="true" />
              <span className="row-text">
                <strong>{t('Tours and tickets')}</strong>
                <small>{t('Guided tours and skip-the-line tickets on GetYourGuide')}</small>
              </span>
              <ChevronRight size={18} className="muted" />
            </a>
          </li>
        )}
      </ul>
      {toursUrl('x') && <p className="footnote">{t('Booking links: we may earn a small commission. The price is the same for you.')}</p>}
    </section>
  )
}
