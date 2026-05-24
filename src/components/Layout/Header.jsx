import { Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'

function Header() {
  const { theme, toggleTheme } = useTheme()
  const { session, signOut } = useAuth()

  return (
    <header className="header">
      <h1 className="header__title">streamind</h1>
      <div className="header__actions">
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
        {session && (
          <button
            className="header__theme-toggle"
            onClick={() => signOut()}
            aria-label="Sign out"
            title={session.user?.email ? `Sign out (${session.user.email})` : 'Sign out'}
          >
            <LogOut size={20} strokeWidth={2} />
          </button>
        )}
      </div>
    </header>
  )
}

export default Header
