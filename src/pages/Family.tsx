import { Car, PiggyBank, Smartphone } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatAge, moneyTips, parkingRules } from '../lib/places'
import { useChild } from '../lib/useChild'
import type { MoneyTip } from '../types'

export function Family() {
  const { name, setName, birthDate, setBirthDate, napStart, setNapStart, months } = useChild()

  return (
    <div className="page">
      <h1 className="page-title">Family</h1>

      <section className="block">
        <h2>Your child</h2>
        <div className="list-card form">
          <label className="field-row">
            <span>Name</span>
            <input type="text" value={name} placeholder="Optional" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field-row">
            <span>Birthday</span>
            <input
              type="date"
              value={birthDate ?? ''}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBirthDate(e.target.value || null)}
            />
          </label>
          <label className="field-row">
            <span>Nap time</span>
            <input type="time" value={napStart} onChange={(e) => setNapStart(e.target.value)} />
          </label>
        </div>
        <p className="small muted">
          {months !== null ? `${name || 'Your child'} is ${formatAge(months)} old. ` : ''}Saved only on this phone.
        </p>
      </section>

      <section className="block">
        <h2>Install the app</h2>
        <div className="list-card padded">
          <p className="with-icon">
            <Smartphone size={18} /> <strong>iPhone:</strong> Safari → Share → Add to Home Screen
          </p>
          <p className="with-icon">
            <Smartphone size={18} /> <strong>Android:</strong> Chrome → ⋮ → Install app
          </p>
        </div>
      </section>

      <Accordion title="Money-saving tips" icon={<PiggyBank size={18} />} tips={moneyTips} />
      <Accordion title="Parking in Tallinn" icon={<Car size={18} />} tips={parkingRules} />

      <p className="footnote">Parents Hub · Tallinn</p>
    </div>
  )
}

function Accordion({ title, icon, tips }: { title: string; icon: ReactNode; tips: MoneyTip[] }) {
  if (!tips.length) return null
  return (
    <details className="accordion">
      <summary>
        {icon} {title}
      </summary>
      <ul>
        {tips.map((t) => (
          <li key={t.title}>
            <strong>{t.title}</strong>
            <p className="small">{t.detail}</p>
          </li>
        ))}
      </ul>
    </details>
  )
}
