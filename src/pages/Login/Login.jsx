import { useState } from 'react'
import { Heart, Mail, Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './Login.css'

function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        const { data, error } = await signUp(email, password)
        if (error) throw error
        if (!data.session) {
          setInfo('Check your email to confirm your account, then sign in.')
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <Heart size={28} strokeWidth={2} className="login__brand-icon" />
          <h1 className="login__title">streamind</h1>
        </div>
        <p className="login__subtitle">
          {mode === 'signin' ? 'Sign in to sync your sessions' : 'Create an account to get started'}
        </p>

        <form className="login__form" onSubmit={handleSubmit}>
          <label className="login__field">
            <span className="login__field-label">
              <Mail size={16} strokeWidth={2} /> Email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login__input"
              placeholder="you@example.com"
            />
          </label>

          <label className="login__field">
            <span className="login__field-label">
              <Lock size={16} strokeWidth={2} /> Password
            </span>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login__input"
              placeholder="At least 6 characters"
            />
          </label>

          {error && <p className="login__error">{error}</p>}
          {info && <p className="login__info">{info}</p>}

          <button type="submit" className="login__submit" disabled={busy}>
            {busy ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          type="button"
          className="login__switch"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
            setInfo(null)
          }}
        >
          {mode === 'signin'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}

export default Login
