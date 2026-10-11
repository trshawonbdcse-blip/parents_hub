import { CalendarDays, Compass, Heart, Home, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useEffect } from 'react'
import { useT } from '../lib/i18n'
import { useNewEvents } from './Engage'

const items = [
  { to: '/', label: 'Today', Icon: Home, end: true },
  { to: '/explore', label: 'Explore', Icon: Compass, end: false },
  { to: '/events', label: 'Events', Icon: CalendarDays, end: false },
  { to: '/saved', label: 'Saved', Icon: Heart, end: false },
  { to: '/me', label: 'Family', Icon: User, end: false },
]

export function BottomNav() {
  const { t } = useT()
  const { fresh, seen, markSeen } = useNewEvents()
  // First run: start counting new events from today.
  useEffect(() => {
    if (!seen) markSeen()
  }, [seen, markSeen])
  return (
    <nav className="bottom-nav" aria-label="Main">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="nav-item">
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>{t(label)}</span>
          {to === '/events' && fresh.length > 0 && <span className="nav-dot">{fresh.length > 9 ? '9+' : fresh.length}</span>}
        </NavLink>
      ))}
    </nav>
  )
}
