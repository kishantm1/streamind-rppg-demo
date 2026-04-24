import { Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'

function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user, signOut } = useAuth()

  return (
    <header className="header">
      <h1 className="header__title">streamind</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        {user?.email && (
          <span
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={user.email}
          >
            {user.email}
          </span>
        )}
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
        <button
          className="header__theme-toggle"
          onClick={signOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={20} strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}

export default Header
