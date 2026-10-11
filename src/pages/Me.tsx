import { useSearchParams } from 'react-router-dom'
import { useT } from '../lib/i18n'
import { KEYS, useIdList, useStored } from '../lib/storage'
import type { Visit } from '../types'
import { Family } from './Family'
import { Saved } from './Saved'

const NO_VISITS: Visit[] = []
type Tab = 'saved' | 'moments' | 'family'

// Everything personal in one tab: saved places, the moments diary and family settings.
export function Me() {
  const { t } = useT()
  const [params, setParams] = useSearchParams()
  const tab = (['saved', 'moments', 'family'].includes(params.get('tab') ?? '') ? params.get('tab') : 'saved') as Tab
  const favorites = useIdList(KEYS.favorites)
  const wishlist = useIdList(KEYS.wishlist)
  const [visits] = useStored<Visit[]>(KEYS.visits, NO_VISITS)

  return (
    <div className="page">
      <h1 className="page-title">{t('Me')}</h1>
      <div className="segmented wide" role="tablist">
        {(
          [
            ['saved', 'Saved', favorites.ids.length + wishlist.ids.length],
            ['moments', 'Moments', visits.length],
            ['family', 'Family', null],
          ] as const
        ).map(([key, label, n]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setParams({ tab: key }, { replace: true })}>
            {t(label)} {n !== null && n > 0 && <span className="count">{n}</span>}
          </button>
        ))}
      </div>
      {tab === 'family' ? <Family /> : <Saved view={tab} />}
    </div>
  )
}
