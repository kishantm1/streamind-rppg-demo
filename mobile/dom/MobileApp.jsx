import { Routes, Route, Navigate } from 'react-router-dom'
import MobileLayout from './MobileLayout'
import Monitor from '../../src/pages/Monitor/Monitor'
import History from '../../src/pages/History/History'
import Breathing from '../../src/pages/Breathing/Breathing'
import Mood from '../../src/pages/Mood/Mood'

export default function MobileApp() {
  return (
    <MobileLayout>
      <Routes>
        <Route path="/" element={<Monitor />} />
        <Route path="/history" element={<History />} />
        <Route path="/breathing" element={<Breathing />} />
        <Route path="/mood" element={<Mood />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MobileLayout>
  )
}
