import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import AppLayout from './components/layout/AppLayout'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import ComptaMindPage from './pages/ComptaMindPage'
import MemoryPage from './pages/MemoryPage'
import SettingsPage from './pages/SettingsPage'
import RapportsPage from './pages/RapportsPage'
import AutonomiePage from './pages/AutonomiePage'
import AutorisationsPage from './pages/AutorisationsPage'

function RequireAuth({ children }) {
  const { isAuthenticated } = useAppStore()
  if (!isAuthenticated) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { isAuthenticated } = useAppStore()

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />}
        />
        {/* Protected app */}
        <Route element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/comptamind" element={<ComptaMindPage />} />
          <Route path="/memoire" element={<MemoryPage />} />
          <Route path="/rapports" element={<RapportsPage />} />
          <Route path="/parametres" element={<SettingsPage />} />
          <Route path="/autonomie" element={<AutonomiePage />} />
          <Route path="/autorisations" element={<AutorisationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
