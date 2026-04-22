import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Check, Bot, Mail, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'

const features = [
  'Révision balance automatique sur tous vos dossiers',
  'Rapprochement bancaire en 5 minutes',
  'Détection d\'anomalies en continu',
  'Relances clients automatisées',
  'Tableau de bord cabinet centralisé',
]

export default function AuthPage() {
  const [tab, setTab] = useState('login') // 'login' | 'signup'
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.'
        : error.message)
      setLoading(false)
      return
    }
    // App.jsx redirige automatiquement via onAuthStateChange
    navigate('/dashboard')
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // Si la confirmation email est désactivée dans Supabase → session créée directement
    if (data.session) {
      navigate('/onboarding')
    } else {
      // Confirmation email activée → on affiche un message
      setSignupSuccess(true)
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
            Le collaborateur IA des cabinets comptables
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            L'intelligence artificielle<br />au service de votre<br />cabinet comptable
          </h2>
          <p className="text-slate-300 text-lg mb-8">
            Connecté à Pennylane. Opérationnel en 15 minutes.
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

        <p className="text-slate-500 text-xs">© 2026 ComptaMind</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #6366f1, #06b6d4)'}}>
              <span className="text-white font-black text-lg">C</span>
            </div>
            <span className="font-bold text-xl text-slate-900">ComptaMind</span>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => { setTab('login'); setError(''); setSignupSuccess(false) }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Se connecter
            </button>
            <button
              onClick={() => { setTab('signup'); setError(''); setSignupSuccess(false) }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Créer un compte
            </button>
          </div>

          {/* Signup success */}
          {signupSuccess ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check size={24} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Compte créé !</h2>
              <p className="text-slate-500 text-sm">Un email de confirmation vous a été envoyé à <strong>{email}</strong>. Cliquez sur le lien pour activer votre compte.</p>
            </div>
          ) : tab === 'login' ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Bon retour 👋</h1>
                <p className="text-slate-500 text-sm mt-1">Connectez-vous à votre espace cabinet</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      className={`input pl-9 ${error ? 'border-red-300' : ''}`}
                      placeholder="cabinet@exemple.fr"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      required autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Mot de passe</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`input pl-9 pr-10 ${error ? 'border-red-300' : ''}`}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
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
                Pas encore de compte ?{' '}
                <button onClick={() => setTab('signup')} className="text-indigo-600 font-semibold hover:underline">
                  Créer un compte gratuit
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Créer votre cabinet</h1>
                <p className="text-slate-500 text-sm mt-1">Accès test 14 jours · Sans carte bancaire</p>
              </div>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="label">Email professionnel</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      className={`input pl-9 ${error ? 'border-red-300' : ''}`}
                      placeholder="cabinet@exemple.fr"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      required autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Mot de passe</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`input pl-9 pr-10 ${error ? 'border-red-300' : ''}`}
                      placeholder="8 caractères minimum"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      className={`input pl-9 ${error ? 'border-red-300' : ''}`}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                      required
                    />
                  </div>
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Création du compte...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      Créer mon compte gratuit
                      <ArrowRight size={18} />
                    </div>
                  )}
                </button>
              </form>
              <p className="text-xs text-slate-400 text-center mt-4">
                En créant un compte vous acceptez nos{' '}
                <a href="https://comptamind.fr/mentions-legales.html" target="_blank" rel="noopener" className="underline">CGU</a>
              </p>
              <p className="text-xs text-slate-400 text-center mt-3">
                Déjà un compte ?{' '}
                <button onClick={() => setTab('login')} className="text-indigo-600 font-semibold hover:underline">
                  Se connecter
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
