import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Today', icon: '☀️', end: true },
  { to: '/explore', label: 'Explore', icon: '🔍', end: false },
  { to: '/events', label: 'Events', icon: '📅', end: false },
  { to: '/saved', label: 'Saved', icon: '♥', end: false },
  { to: '/me', label: 'Family', icon: '👶', end: false },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className="nav-item">
          <span className="nav-icon" aria-hidden="true">
            {i.icon}
          </span>
          <span>{i.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
