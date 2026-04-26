import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="header">
      <h1 className="header__title">streamind</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <button
          className="header__theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <Moon size={20} strokeWidth={2} />
          ) : (
            <Sun size={20} strokeWidth={2} />
          )}
        </button>
      </div>
    </header>
  )
}

export default Header
