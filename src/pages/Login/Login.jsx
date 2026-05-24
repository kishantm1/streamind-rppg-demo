import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './Login.css'

function Login() {
  const { session, loading: authLoading, signIn, signUp } = useAuth()
  const location = useLocation()

  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  if (!authLoading && session) {
    const to = location.state?.from?.pathname || '/'
    return <Navigate to={to} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

    try {
      const fn = mode === 'signin' ? signIn : signUp
      const { data, error: err } = await fn(email, password)
      if (err) {
        setError(err.message)
      } else if (mode === 'signup' && !data.session) {
        setInfo('Check your email to confirm your account before signing in.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <Heart size={32} className="login__brand-icon" />
          <h1 className="login__brand-name">streamind</h1>
        </div>

        <h2 className="login__heading">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h2>

        <form className="login__form" onSubmit={handleSubmit}>
          <label className="login__label">
            <span>Email</span>
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

          <label className="login__label">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login__input"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="login__error" role="alert">{error}</p>}
          {info && <p className="login__info" role="status">{info}</p>}

          <button type="submit" className="login__submit" disabled={submitting}>
            {submitting
              ? 'Please wait…'
              : mode === 'signin'
              ? 'Sign in'
              : 'Sign up'}
          </button>
        </form>

        <p className="login__toggle">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            className="login__toggle-btn"
            onClick={() => {
              setError(null)
              setInfo(null)
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
            }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default Login
