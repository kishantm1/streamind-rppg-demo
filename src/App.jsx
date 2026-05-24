import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Monitor from './pages/Monitor/Monitor'
import History from './pages/History/History'
import Breathing from './pages/Breathing/Breathing'
import Mood from './pages/Mood/Mood'
import Login from './pages/Login/Login'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Monitor />} />
                <Route path="/history" element={<History />} />
                <Route path="/breathing" element={<Breathing />} />
                <Route path="/mood" element={<Mood />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
