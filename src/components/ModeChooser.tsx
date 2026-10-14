import { Plane, User, Users } from 'lucide-react'
import { useEffect } from 'react'
import { useT } from '../lib/i18n'
import { useMode } from '../lib/mode'
import { KEYS } from '../lib/storage'

// Asked once on the very first open. People who already used the app keep Family.
export function ModeChooser() {
  const { t } = useT()
  const [mode, setMode] = useMode()
  const returning = (() => {
    try {
      return [KEYS.childBirthDate, KEYS.visits, KEYS.favorites, KEYS.childName].some((k) => localStorage.getItem(k) !== null)
    } catch {
      return false
    }
  })()
  useEffect(() => {
    if (mode === null && returning) setMode('family')
  }, [mode, returning, setMode])
  if (mode !== null || returning) return null
  return (
    <div className="chooser" role="dialog" aria-modal="true" aria-labelledby="chooser-title">
      <span className="brand">kuhu minna</span>
      <h1 id="chooser-title">{t('Who are you planning for?')}</h1>
      <button type="button" className="chooser-option primary" onClick={() => setMode('family')}>
        <Users size={22} aria-hidden="true" />
        <span>
          <strong>{t('My family')}</strong>
          <small>{t('Ideas by your child’s age, naps and the weather')}</small>
        </span>
      </button>
      <button type="button" className="chooser-option" onClick={() => setMode('me')}>
        <User size={22} aria-hidden="true" />
        <span>
          <strong>{t('Just me')}</strong>
          <small>{t('Sport, swimming, culture and nature, with Stebby where it works')}</small>
        </span>
      </button>
      <button type="button" className="chooser-option" onClick={() => setMode('visit')}>
        <Plane size={22} aria-hidden="true" />
        <span>
          <strong>{t('I’m visiting Estonia')}</strong>
          <small>{t('Sights, a day plan for the weather, and what’s on tonight')}</small>
        </span>
      </button>
      <p className="muted small">{t('You can switch any time at the top of Today and Explore.')}</p>
    </div>
  )
}
