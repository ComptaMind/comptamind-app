import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight, ArrowLeft, Building2, Users, Link, Zap, Sparkles } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const steps = [
  { id: 1, label: 'Votre cabinet', icon: Building2 },
  { id: 2, label: 'Vos préférences', icon: Zap },
  { id: 3, label: 'Connexion Pennylane', icon: Link },
  { id: 4, label: 'Premier client', icon: Users },
  { id: 5, label: 'Terminé !', icon: Sparkles },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [finishing, setFinishing] = useState(false)
  const [data, setData] = useState({
    cabinet: {},
    preferences: { saisieAuto: true, revisionAuto: true, relancesAuto: false },
    pennylane: { connected: false, token: '' },
    premierClient: {},
  })
  const { completeOnboarding, addClient } = useAppStore()
  const navigate = useNavigate()

  const handleFinish = async () => {
    setFinishing(true)
    await completeOnboarding(data.cabinet)
    if (data.premierClient.nom) {
      addClient(data.premierClient)
    }
    navigate('/dashboard')
  }

  const progressPercent = ((step - 1) / (steps.length - 1)) * 100

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-8 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <span className="text-white font-black">C</span>
            </div>
            <span className="font-bold text-slate-900">ComptaMind</span>
          </div>
          <span className="text-sm text-slate-500">Étape {step} sur {steps.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-2xl mx-auto">
          <div className="h-1 bg-slate-100">
            <div
              className="h-full gradient-brand transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="bg-white border-b border-slate-100 px-8 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {steps.map((s, i) => {
            const Icon = s.icon
            const isCompleted = step > s.id
            const isActive = step === s.id
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  isCompleted ? 'bg-emerald-500' : isActive ? 'gradient-brand' : 'bg-slate-100'
                }`}>
                  {isCompleted
                    ? <Check size={14} className="text-white" />
                    : <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                  }
                </div>
                <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-slate-900' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${step > s.id ? 'bg-emerald-200' : 'bg-slate-100'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-lg animate-slide-up">
          {step === 1 && (
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Informations du cabinet</h2>
              <p className="text-slate-500 text-sm mb-6">Ces informations personnalisent l'expérience ComptaMind pour votre cabinet.</p>
              <div className="space-y-4">
                <div>
                  <label className="label">Nom du cabinet *</label>
                  <input className="input" placeholder="Cabinet Lambert & Associés"
                    value={data.cabinet.nom || ''}
                    onChange={e => setData({...data, cabinet: {...data.cabinet, nom: e.target.value}})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">SIRET</label>
                    <input className="input" placeholder="123 456 789 00010"
                      value={data.cabinet.siret || ''}
                      onChange={e => setData({...data, cabinet: {...data.cabinet, siret: e.target.value}})} />
                  </div>
                  <div>
                    <label className="label">Téléphone</label>
                    <input className="input" placeholder="01 23 45 67 89"
                      value={data.cabinet.tel || ''}
                      onChange={e => setData({...data, cabinet: {...data.cabinet, tel: e.target.value}})} />
                  </div>
                </div>
                <div>
                  <label className="label">Adresse</label>
                  <input className="input" placeholder="15 rue de la Paix, 75001 Paris"
                    value={data.cabinet.adresse || ''}
                    onChange={e => setData({...data, cabinet: {...data.cabinet, adresse: e.target.value}})} />
                </div>
                <div>
                  <label className="label">Nombre de collaborateurs</label>
                  <select className="input"
                    value={data.cabinet.taille || ''}
                    onChange={e => setData({...data, cabinet: {...data.cabinet, taille: e.target.value}})}>
                    <option value="">Sélectionner</option>
                    <option value="1">Seul(e)</option>
                    <option value="2-5">2 à 5 personnes</option>
                    <option value="6-15">6 à 15 ersonnes</option>
                    <option value="16+">Plus de 15 personnes</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Vos préférences IA</h2>
              <p className="text-slate-500 text-sm mb-6">Configurez comment ComptaMind travaille pour votre cabinet.</p>
              <div className="space-y-4">
                {[
                  { key: 'saisieAuto', label: 'Saisie automatique', desc: 'ComptaMind effectue la saisie automatiquement selon le calendrier' },
                  { key: 'revisionAuto', label: 'Révision automatique', desc: 'ComptaMind lance la révision après chaque saisie' },
                  { key: 'relancesAuto', label: 'Relances automatiques', desc: 'ComptaMind envoie les relances clients selon les règles définies' },
                ].map(pref => (
                  <div key={pref.key} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-brand-200 transition-colors">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        id={pref.key}
                        checked={data.preferences[pref.key]}
                        onChange={e => setData({...data, preferences: {...data.preferences, [pref.key]: e.target.checked}})}
                        className="sr-only"
                      />
                      <div
                        onClick={() => setData({...data, preferences: {...data.preferences, [pref.key]: !data.preferences[pref.key]}})}
                        className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${data.preferences[pref.key] ? 'bg-brand-600' : 'bg-slate-200'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-1 ${data.preferences[pref.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{pref.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{pref.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Connexion Pennylane</h2>
              <p className="text-slate-500 text-sm mb-6">Connectez ComptaMind à Pennylane pour automatiser la saisie et la révision.</p>

              <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 mb-6">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                  <span className="font-black text-indigo-600 text-lg">P</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Pennylane</div>
                  <div className="text-sm text-slate-500">Logiciel de comptabilité SaaS</div>
                </div>
                {data.pennylane.connected
                  ? <div className="ml-auto badge bg-emerald-100 text-emerald-700"><Check size={10} /> Connecté</div>
                  : <div className="ml-auto badge bg-slate-100 text-slate-500">Non connecté</div>
                }
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Token API Pennylane</label>
                  <input
                    className="input font-mono text-sm"
                    placeholder="pk_live_xxxxxxxxxxxxxxxxxxxx"
                    type="password"
                    value={data.pennylane.token}
                    onChange={e => setData({...data, pennylane: {...data.pennylane, token: e.target.value}})}
                  />
                  <p className="text-xs text-slate-400 mt-1.5">Trouvez votre token API dans Pennylane → Paramètres → Intégrations</p>
                </div>
                <button
                  type="button"
                  onClick={() => setData({...data, pennylane: {...data.pennylane, connected: true}})}
                  className="btn-secondary w-full"
                >
                  <Link size={16} />
                  Tester la connexion
                </button>
              </div>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <p className="text-xs text-amber-700">
                  <span className="font-semibold">Optionnel :</span> vous pouvez configurer Pennylane plus tard dans les paramètres. ComptaMind peut fonctionner sans cette connexion pour commencer.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Ajouter votre premier client</h2>
              <p className="text-slate-500 text-sm mb-6">Commencez par créer un dossier client. Vous pourrez en ajouter d'autres plus tard.</p>
              <div className="space-y-4">
                <div>
                  <label className="label">Raison sociale *</label>
                  <input className="input" placeholder="ex: Bellevoie SARL"
                    value={data.premierClient.nom || ''}
                    onChange={e => setData({...data, premierClient: {...data.premierClient, nom: e.target.value}})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">SIREN</label>
                    <input className="input" placeholder="123 456 789"
                      value={data.premierClient.siren || ''}
                      onChange={e => setData({...data, premierClient: {...data.premierClient, siren: e.target.value}})} />
                  </div>
                  <div>
                    <label className="label">Secteur</label>
                    <input className="input" placeholder="ex: Commerce"
                      value={data.premierClient.secteur || ''}
                      onChange={e => setData({...data, premierClient: {...data.premierClient, secteur: e.target.value}})} />
                  </div>
                </div>
                <div>
                  <label className="label">Email du dirigeant</label>
                  <input type="email" className="input" placeholder="contact@client.fr"
                    value={data.premierClient.email || ''}
                    onChange={e => setData({...data, premierClient: {...data.premierClient, email: e.target.value}})} />
                </div>
                <div>
                  <label className="label">Régime fiscal</label>
                  <select className="input"
                    value={data.premierClient.regime || ''}
                    onChange={e => setData({...data, premierClient: {...data.premierClient, regime: e.target.value}})}>
                    <option value="">Sélectionner</option>
                    <option value="is">IS — Impôt sur les sociétés</option>
                    <option value="ir">IR — Impôt sur le revenu</option>
                    <option value="bnc">BNC — Bénéfices non commerciaux</option>
                    <option value="ba">BA — Bénéfices agricoles</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="card p-8 text-center">
              <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-6">
                <Sparkles size={36} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">ComptaMind est prêt !</h2>
              <p className="text-slate-500 mb-8">
                Votre cabinet est configuré. ComptaMind va commencer à apprendre vos préférences et optimiser son travail pour vous.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { label: 'Cabinet créé', icon: '🏢' },
                  { label: 'IA configurée', icon: '🤖' },
                  { label: 'Prêt à démarrer', icon: '✅' },
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-xs font-medium text-slate-600">{item.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={handleFinish} disabled={finishing} className="btn-primary w-full py-3 text-base">
                {finishing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Chargement...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles size={18} />
                    Accéder à mon tableau de bord
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className={`btn-ghost ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
            >
              <ArrowLeft size={16} />
              Retour
            </button>
            {step < steps.length && (
              <button
                onClick={() => setStep(s => Math.min(steps.length, s + 1))}
                className="btn-primary"
              >
                Continuer
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
