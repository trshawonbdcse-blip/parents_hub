import { CalendarDays, Compass, Heart, Home, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Today', Icon: Home, end: true },
  { to: '/explore', label: 'Explore', Icon: Compass, end: false },
  { to: '/events', label: 'Events', Icon: CalendarDays, end: false },
  { to: '/saved', label: 'Saved', Icon: Heart, end: false },
  { to: '/me', label: 'Family', Icon: User, end: false },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="nav-item">
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
