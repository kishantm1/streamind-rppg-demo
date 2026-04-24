import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Monitor from './pages/Monitor/Monitor'
import History from './pages/History/History'
import Breathing from './pages/Breathing/Breathing'
import Mood from './pages/Mood/Mood'
import Login from './pages/Login/Login'
import { useAuth } from './context/AuthContext'

function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Monitor />} />
        <Route path="/history" element={<History />} />
        <Route path="/breathing" element={<Breathing />} />
        <Route path="/mood" element={<Mood />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
