import { NavLink } from 'react-router-dom'
import { Heart, BarChart3, Wind, Smile } from 'lucide-react'

const navItems = [
  { to: '/', icon: Heart, label: 'Monitor' },
  { to: '/history', icon: BarChart3, label: 'History' },
  { to: '/breathing', icon: Wind, label: 'Breathe' },
  { to: '/mood', icon: Smile, label: 'Mood' },
]

function Navigation() {
  return (
    <nav className="navigation" role="navigation" aria-label="Main navigation">
      <ul className="navigation__list">
        {navItems.map(({ to, icon: Icon, label }) => (
          <li key={to} className="navigation__item">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `navigation__link ${isActive ? 'navigation__link--active' : ''}`
              }
            >
              <Icon
                size={24}
                strokeWidth={1.5}
                className="navigation__icon"
              />
              <span className="navigation__label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Navigation
