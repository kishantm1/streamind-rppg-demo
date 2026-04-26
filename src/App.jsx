import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Monitor from './pages/Monitor/Monitor'
import History from './pages/History/History'
import Breathing from './pages/Breathing/Breathing'
import Mood from './pages/Mood/Mood'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Monitor />} />
        <Route path="/history" element={<History />} />
        <Route path="/breathing" element={<Breathing />} />
        <Route path="/mood" element={<Mood />} />
      </Routes>
    </Layout>
  )
}

export default App
