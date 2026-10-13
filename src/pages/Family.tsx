import { Car, ChevronRight, PiggyBank, Smartphone } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatAge, moneyTips, parkingRules } from '../lib/places'
import { useChild } from '../lib/useChild'
import { useStebby } from '../lib/stebby'
import { isNative, setWeekendReminder } from '../lib/native'
import { KEYS, useStored } from '../lib/storage'
import { Link } from 'react-router-dom'
import { LANGS, setLang, useT } from '../lib/i18n'
import { localizedTips } from '../lib/tipsText'
import { CONTACT_EMAIL } from '../lib/feedback'
import type { MoneyTip } from '../types'

export function Family() {
  const { t, lang } = useT()
  const { name, setName, birthDate, setBirthDate, napStart, setNapStart, months } = useChild()
  const [hasStebby, setHasStebby] = useStebby()
  const [goal, setGoal] = useStored<number>(KEYS.weeklyGoal, 2)
  const [reminder, setReminder] = useStored<boolean>('ph.weekendReminder', false)
  const toggleReminder = async () => {
    const on = await setWeekendReminder(!reminder, t('Your weekend plan is ready'), t('Weather, events and ideas for Saturday and Sunday.'))
    setReminder(on)
  }

  return (
    <>

      <section className="block">
        <h2>{t('Language')}</h2>
        <div className="segmented wide">
          {LANGS.map((l) => (
            <button key={l.code} className={lang === l.code ? 'on' : ''} onClick={() => setLang(l.code)}>
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <section className="block">
        <h2>{t('Your child')}</h2>
        <div className="list-card form">
          <label className="field-row">
            <span>{t('Name')}</span>
            <input type="text" value={name} placeholder={t('Optional')} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field-row">
            <span>{t('Birthday')}</span>
            <input
              type="date"
              value={birthDate ?? ''}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBirthDate(e.target.value || null)}
            />
          </label>
          <label className="field-row">
            <span>{t('Nap time')}</span>
            <input type="time" value={napStart} onChange={(e) => setNapStart(e.target.value)} />
          </label>
        </div>
        <p className="small muted">
          {months !== null ? t('{name} is {age} old.', { name: name || t('Your child'), age: formatAge(months) }) + ' ' : ''}{t('Saved only on this phone.')}
        </p>
      </section>

      <section className="block">
        <h2>{t('Weekly outing goal')}</h2>
        <div className="segmented wide">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} className={goal === n ? 'on' : ''} onClick={() => setGoal(n)}>
              {n}
            </button>
          ))}
        </div>
        <p className="small muted">{t('How many outings a week you’d like. Shown on the Today page.')}</p>
        {isNative && (
          <div className="list-card padded">
            <label className="switch-row">
              <span>{t('Weekend plan reminder (Thursday 18:00)')}</span>
              <input type="checkbox" role="switch" checked={reminder} onChange={toggleReminder} />
            </label>
          </div>
        )}
      </section>

      <section className="block">
        <h2>{t('Benefits')}</h2>
        <div className="list-card padded">
          <label className="switch-row">
            <span>{t('I have a Stebby account')}</span>
            <input type="checkbox" role="switch" checked={hasStebby} onChange={() => setHasStebby(!hasStebby)} />
          </label>
        </div>
        <p className="small muted">
          {t('Shows which places are Stebby partners. The budget is for you, not your child: use it for your own ticket or classes you join.')}{' '}
          {hasStebby && <Link to="/explore?stebby=1">{t('See Stebby places')}</Link>}
        </p>
      </section>

      {!isNative && (
      <section className="block">
        <h2>{t('Install the app')}</h2>
        <div className="list-card padded">
          <p className="with-icon">
            <Smartphone size={18} /> <strong>iPhone:</strong> {t('Safari → Share → Add to Home Screen')}
          </p>
          <p className="with-icon">
            <Smartphone size={18} /> <strong>Android:</strong> {t('Chrome → ⋮ → Install app')}
          </p>
        </div>
      </section>
      )}

      <Accordion title={t('Money-saving tips')} icon={<PiggyBank size={18} />} tips={localizedTips('money', moneyTips)} />
      <Accordion title={t('Parking in Tallinn')} icon={<Car size={18} />} tips={localizedTips('parking', parkingRules)} />

      <section className="block">
        <h2>{t('Your data')}</h2>
        <div className="list-card padded">
          <p className="small">{t('Everything you enter stays on this phone. No account, no tracking.')}</p>
          {CONTACT_EMAIL && (
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Parents Hub')}`} className="link-more">
              {t('Send feedback')} <ChevronRight size={16} />
            </a>
          )}
          <Link to="/privacy" className="link-more">
            {t('Privacy')} <ChevronRight size={16} />
          </Link>
          <button
            className="button secondary danger"
            onClick={() => {
              if (!confirm(t('Delete your child’s details, favourites, notes and moments from this phone?'))) return
              try {
                Object.keys(localStorage).filter((k) => k.startsWith('ph.')).forEach((k) => localStorage.removeItem(k))
              } catch {
                // Storage blocked: nothing to delete.
              }
              location.reload()
            }}
          >
            {t('Delete all my data')}
          </button>
        </div>
      </section>

      <p className="footnote">Parents Hub · Eesti</p>
    </>
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
