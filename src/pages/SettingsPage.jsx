import { useState } from 'react'
import { Save, Link, User, Building2, Bell, Shield, CreditCard, Users } from 'lucide-react'
import Header from '../components/layout/Header'
import { useAppStore } from '../store/useAppStore'

const TABS = [
  { id: 'cabinet', label: 'Firm', icon: Building2 },
  { id: 'integrations', label: 'Integrations', icon: Link },
  { id: 'equipe', label: 'Team', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'abonnement', label: 'Subscription', icon: CreditCard },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('cabinet')
  const [saved, setSaved] = useState(false)
  const { cabinet, user } = useAppStore()
  const [cabinetForm, setCabinetForm] = useState({
    nom: cabinet?.nom || '',
    siret: cabinet?.siret || '',
    adresse: '',
    tel: '',
    email: user?.email || '',
  })
  const [pennylaneToken, setPennylaneToken] = useState('')
  const [pennylaneConnected, setPennylaneConnected] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <Header
        title="Settings"
        subtitle="Manage your firm and ComptaMind preferences"
        actions={
          <button onClick={handleSave} className="btn-primary">
            <Save size={16} />
            {saved ? '✓ Saved!' : 'Save'}
          </button>
        }
      />

      <div className="p-8 flex gap-8">
        {/* Sidebar tabs */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                  tab === id ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {tab === 'cabinet' && (
            <div className="card p-6">
              <h2 className="text-base font-bold text-slate-900 mb-5">Firm information</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Firm name</label>
                  <input className="input" value={cabinetForm.nom} onChange={e => setCabinetForm({...cabinetForm, nom: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">SIRET</label>
                    <input className="input" value={cabinetForm.siret} onChange={e => setCabinetForm({...cabinetForm, siret: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" placeholder="+1 234 567 8900" value={cabinetForm.tel} onChange={e => setCabinetForm({...cabinetForm, tel: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="label">Address</label>
                  <input className="input" placeholder="15 Main Street, New York" value={cabinetForm.adresse} onChange={e => setCabinetForm({...cabinetForm, adresse: e.target.value})} />
                </div>
                <div>
                  <label className="label">Contact email</label>
                  <input type="email" className="input" value={cabinetForm.email} onChange={e => setCabinetForm({...cabinetForm, email: e.target.value})} />
                </div>
              </div>
            </div>
          )}

          {tab === 'integrations' && (
            <div className="space-y-4">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <span className="font-black text-indigo-700 text-xl">P</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Pennylane</h3>
                      <p className="text-xs text-slate-500">Connect your Pennylane account for automatic entry</p>
                    </div>
                  </div>
                  <div className={`badge ${pennylaneConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {pennylaneConnected ? '✓ Connected' : 'Not connected'}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="label">Token API</label>
                    <input type="password" className="input font-mono text-sm" placeholder="pk_live_xxxxxxxxxxxx" value={pennylaneToken} onChange={e => setPennylaneToken(e.target.value)} />
                  </div>
                  <button onClick={() => setPennylaneConnected(true)} className="btn-secondary w-full">
                    <Link size={15} /> Test and connect
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'abonnement' && (
            <div className="space-y-4">
              <div className="card p-6 border-brand-200 bg-brand-50/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Essential Plan</h3>
                    <p className="text-sm text-slate-500">Active · Renewal on May 1, 2024</p>
                  </div>
                  <div className="text-2xl font-black gradient-text">99€/mois</div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-brand-100">
                  {[
                    { label: 'Clients included', value: '20' },
                    { label: 'AI operations/month', value: 'Unlimited' },
                    { label: 'Storage', value: '50 GB' },
                  ].map((item, i) => (
                    <div key={i} className="text-center p-3 bg-white/70 rounded-xl">
                      <div className="font-bold text-slate-900">{item.value}</div>
                      <div className="text-xs text-slate-500">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Upgrade to Premium</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { title: 'Essential', price: '99€/mo', clients: '20 clients', highlight: false },
                    { title: 'Premium', price: '199€/mo', clients: 'Unlimited clients', highlight: true },
                  ].map((plan, i) => (
                    <div key={i} className={`p-4 rounded-xl border-2 ${plan.highlight ? 'border-brand-400 bg-brand-50' : 'border-slate-100'}`}>
                      <div className="font-bold text-slate-900">{plan.title}</div>
                      <div className="text-2xl font-black text-slate-900 my-1">{plan.price}</div>
                      <div className="text-xs text-slate-500">{plan.clients}</div>
                      {plan.highlight && (
                        <button className="btn-primary w-full mt-3 text-sm py-2">Upgrade to Premium</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(tab === 'equipe' || tab === 'notifications') && (
            <div className="card p-10 text-center">
              <div className="text-4xl mb-3">🚧</div>
              <p className="text-slate-600 font-medium">This section is coming soon</p>
              <p className="text-slate-400 text-sm mt-1">Team management and notifications will be available in the next update.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
