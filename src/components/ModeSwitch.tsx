import { User, Users } from 'lucide-react'
import { useT } from '../lib/i18n'
import { useMode } from '../lib/mode'

// "Family / Just me" switch shown at the top of Today and Explore.
export function ModeSwitch() {
  const { t } = useT()
  const [mode, setMode] = useMode()
  const current = mode ?? 'family'
  return (
    <div className="mode-switch" role="group" aria-label={t('Who are you planning for?')}>
      <button type="button" className={current === 'family' ? 'on' : ''} aria-pressed={current === 'family'} onClick={() => setMode('family')}>
        <Users size={16} aria-hidden="true" /> {t('Family')}
      </button>
      <button type="button" className={current === 'me' ? 'on' : ''} aria-pressed={current === 'me'} onClick={() => setMode('me')}>
        <User size={16} aria-hidden="true" /> {t('Just me')}
      </button>
    </div>
  )
}
