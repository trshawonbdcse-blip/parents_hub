import { formatAge, moneyTips } from '../lib/places'
import { useChild } from '../lib/useChild'

export function Family() {
  const { name, setName, birthDate, setBirthDate, napStart, setNapStart, months } = useChild()

  return (
    <div className="page">
      <header className="page-header">
        <h1>Our family</h1>
        <p className="muted small">Used to suggest places that fit your child. Saved only on this phone.</p>
      </header>

      <section className="card form">
        <label>
          Child's name
          <input type="text" value={name} placeholder="e.g. Ayaan" onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Birthday
          <input
            type="date"
            value={birthDate ?? ''}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setBirthDate(e.target.value || null)}
          />
        </label>
        {months !== null && <p className="small ok">Now {formatAge(months)} old</p>}
        <label>
          Usual nap time
          <input type="time" value={napStart} onChange={(e) => setNapStart(e.target.value)} />
        </label>
      </section>

      <section className="card">
        <h2>📱 Add to your home screen</h2>
        <p className="small">
          <strong>iPhone (Safari):</strong> tap the Share button <span aria-hidden="true">⬆️</span>, then “Add to Home
          Screen”.
        </p>
        <p className="small">
          <strong>Android (Chrome):</strong> tap the ⋮ menu, then “Install app” or “Add to Home screen”.
        </p>
        <p className="small muted">It then opens like a normal app and works offline for saved info.</p>
      </section>

      {moneyTips.length > 0 && (
        <section>
          <h2>💰 Money-saving tips</h2>
          <ul className="stack">
            {moneyTips.map((t) => (
              <li key={t.title} className="card">
                <strong>{t.title}</strong>
                <p className="small">{t.detail}</p>
                <a className="small" href={t.source} target="_blank" rel="noreferrer">
                  Source ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="small muted center">Parents Hub · Tallinn · v0.1</p>
    </div>
  )
}
