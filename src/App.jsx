import { useEffect } from 'react'
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
  const { isAuthenticated, authLoading, onboardingComplete } = useAppStore()
  if (authLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (!onboardingComplete) return <Navigate to="/onboarding" replace />
  return children
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #6366f1, #06b6d4)'}}>
          <span className="text-white font-black text-2xl">C</span>
        </div>
        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    </div>
  )
}

export default function App() {
  const { isAuthenticated, authLoading, onboardingComplete, initAuth } = useAppStore()

  useEffect(() => {
    initAuth()
  }, [])

  if (authLoading) return <LoadingScreen />

  return (
    <BrowserRouter>
      <Routes>
        {/* Public — redirige vers dashboard si déjà connecté */}
        <Route
          path="/"
          element={
            isAuthenticated
              ? onboardingComplete
                ? <Navigate to="/dashboard" replace />
                : <Navigate to="/onboarding" replace />
              : <AuthPage />
          }
        />

        {/* Onboarding — accessible uniquement si connecté mais pas encore onboardé */}
        <Route
          path="/onboarding"
          element={
            authLoading ? <LoadingScreen /> :
            !isAuthenticated ? <Navigate to="/" replace /> :
            onboardingComplete ? <Navigate to="/dashboard" replace /> :
            <OnboardingPage />
          }
        />

        {/* App protégée */}
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
