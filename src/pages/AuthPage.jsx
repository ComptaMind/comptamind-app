import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Check, Bot, Lock } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const features = [
  'Saisie comptable automatisée par IA',
  'Révision par la balance intelligente',
  'Relances clients automatiques',
  'Mémoire adaptative par dossier',
  'Tableaux de bord cabinet & clients',
]

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAppStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 800))

    const expected = import.meta.env.VITE_APP_PASSWORD
    if (!expected || password === expected) {
      login()
      navigate('/dashboard')
    } else {
      setError('Mot de passe incorrect.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12" style={{background: 'linear-gradient(135deg, #0c0e1a 0%, #1a1040 50%, #0f1628 100%)'}}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #6366f1, #06b6d4)'}}>
            <span className="text-white font-black text-xl">C</span>
          </div>
          <span className="text-white font-bold text-xl">ComptaMind</span>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6" style={{background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)'}}>
            <Bot size={14} />
            Votre collaborateur IA comptable
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            L'intelligence artificielle<br />au service de votre<br />cabinet comptable
          </h2>
          <p className="text-slate-300 text-lg mb-8">
            ComptaMind automatise la saisie, la révision et les relances pour que vous puissiez vous concentrer sur l'essentiel.
          </p>
          <div className="space-y-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-white" />
                </div>
                <span className="text-slate-300 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-500 text-xs">© 2026 ComptaMind — Accès réservé au cabinet</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
              <span className="text-white font-black text-lg">C</span>
            </div>
            <span className="font-bold text-xl text-slate-900">ComptaMind</span>
          </div>

          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{background: 'linear-gradient(135deg, #6366f1, #06b6d4)'}}>
              <Lock size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Espace cabinet</h1>
            <p className="text-slate-500 text-sm mt-1">Entrez votre mot de passe pour accéder à ComptaMind</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Mot de passe cabinet</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`input pr-10 ${error ? 'border-red-300 focus:ring-red-200' : ''}`}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  Accéder au tableau de bord
                  <ArrowRight size={18} />
                </div>
              )}
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center mt-6">
            Accès sécurisé — Cabinet ComptaMind
          </p>
        </div>
      </div>
    </div>
  )
}
