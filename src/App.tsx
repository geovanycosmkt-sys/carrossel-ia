import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import UserDashboardSimple from '@/components/dashboard/UserDashboardSimple'
import SettingsPage from '@/components/settings/SettingsPage'

export default function App() {
    return (
          <Router>
                <Routes>
                        <Route path="/" element={<UserDashboardSimple />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
          </Router>
        )
}
