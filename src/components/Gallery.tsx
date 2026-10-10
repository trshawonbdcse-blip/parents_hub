import { useState } from 'react'
import type { Photo } from '../types'

// Swipeable photo strip. Photos that fail to load (moved or blocked by the host) are hidden.
export function Gallery({ photos, fallback }: { photos: Photo[]; fallback: React.ReactNode }) {
  const [broken, setBroken] = useState<Set<string>>(new Set())
  const visible = photos.filter((p) => !broken.has(p.src))
  if (!visible.length) return <>{fallback}</>

  return (
    <div className="gallery" aria-label="Photos">
      {visible.map((p) => (
        <figure key={p.src} className="gallery-item">
          <img
            src={p.src}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setBroken((b) => new Set(b).add(p.src))}
          />
          <figcaption>
            <a href={p.page} target="_blank" rel="noreferrer">
              📷 {p.credit}
            </a>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
