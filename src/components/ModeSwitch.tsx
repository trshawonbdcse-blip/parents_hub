import { Check, ChevronDown, Plane, User, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../lib/i18n'
import { type Mode, useMode } from '../lib/mode'

const MODES: { mode: Mode; label: string; short: string; hint: string; Icon: typeof User }[] = [
  { mode: 'family', label: 'My family', short: 'Family', hint: 'Ideas by your child’s age, naps and the weather', Icon: Users },
  { mode: 'me', label: 'Just me', short: 'Just me', hint: 'Sport, swimming, culture and nature, with Stebby where it works', Icon: User },
  { mode: 'visit', label: 'I’m visiting Estonia', short: 'Visiting', hint: 'Sights, a day plan for the weather, and what’s on tonight', Icon: Plane },
]

// Small "👤 Just me ▾" chip next to the town; opens a sheet to switch who you plan for.
export function ModeSwitch() {
  const { t } = useT()
  const [mode, setMode] = useMode()
  const [open, setOpen] = useState(false)
  const current = MODES.find((m) => m.mode === (mode ?? 'family'))!
  const choose = (m: Mode) => {
    setMode(m)
    setOpen(false)
  }
  return (
    <>
      <button type="button" className="mode-chip" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`${t('Who are you planning for?')} ${t(current.short)}`}>
        <current.Icon size={16} aria-hidden="true" />
        <span>{t(current.short)}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-label={t('Who are you planning for?')} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2>{t('Who are you planning for?')}</h2>
              <button className="icon-button plain" onClick={() => setOpen(false)} aria-label={t('Close')}>
                <X size={20} />
              </button>
            </div>
            <div className="mode-options">
              {MODES.map(({ mode: m, label, hint, Icon }) => (
                <button key={m} type="button" className={`mode-option ${current.mode === m ? 'on' : ''}`} aria-pressed={current.mode === m} onClick={() => choose(m)}>
                  <Icon size={22} aria-hidden="true" />
                  <span>
                    <strong>{t(label)}</strong>
                    <small>{t(hint)}</small>
                  </span>
                  {current.mode === m && <Check size={20} aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
