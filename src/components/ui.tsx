import {
  Baby,
  Clapperboard,
  Dumbbell,
  Mountain,
  BookOpen,
  Coffee,
  Drama,
  FerrisWheel,
  Landmark,
  Music,
  PawPrint,
  ShoppingBag,
  Snowflake,
  Sun,
  Trees,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import type { Category, Photo } from '../types'

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  playground: FerrisWheel,
  park: Trees,
  museum: Landmark,
  'indoor-play': Baby,
  library: BookOpen,
  swimming: Waves,
  'zoo-farm': PawPrint,
  beach: Sun,
  mall: ShoppingBag,
  cafe: Coffee,
  theatre: Drama,
  class: Music,
  'winter-fun': Snowflake,
  gym: Dumbbell,
  cinema: Clapperboard,
  nature: Mountain,
}

// A place photo, or a calm gradient with the category icon when there is none (or it fails to load).
export function PlaceImage({
  photo,
  category,
  className = '',
}: {
  photo?: Photo
  category: Category
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const Icon = CATEGORY_ICON[category]
  if (!photo || failed) {
    return (
      <div className={`img-fallback cat-${category} ${className}`} aria-hidden="true">
        <Icon size={32} strokeWidth={1.5} />
      </div>
    )
  }
  return (
    <img
      className={`img-cover ${className}`}
      src={photo.src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}
