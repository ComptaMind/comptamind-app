import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Bot, CheckCircle, AlertTriangle, Clock, ArrowRight,
  Zap, Calendar, FileText, ChevronRight, Star, RefreshCw, Building2
} from 'lucide-react'
import Header from '../components/layout/Header'
import { listRecords } from '../lib/airtable'
import {
  TBL_CLIENTS, TBL_QUEUE, TBL_ALERTES,
  FLD_CLIENT_NAME, FLD_CLIENT_STATUS, FLD_CLIENT_PROFIL, FLD_CLIENT_LAST_ACTION
} from '../lib/airtable-schema'

const cabinetName = import.meta.env.VITE_CABINET_NAME || 'votre cabinet'

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card p-5 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
    </div>
  )
}

function ClientCard({ record, onClick }) {
  const fields = record.fields || {}
  const name = fields[FLD_CLIENT_NAME] || fields['Client Name'] || record.id
  const status = fields[FLD_CLIENT_STATUS] || fields['Dossier Status'] || ''
  const profil = fields[FLD_CLIENT_PROFIL] || fields['Profil comptable'] || ''
  const lastAction = fields[FLD_CLIENT_LAST_ACTION] || fields['Last ComptaMind Action'] || ''
  const initials = name.slice(0, 2).toUpperCase()

  const isActif = !status.toLowerCase().includes('inactif') && !status.toLowerCase().includes('archive')

  return (
    <div
      onClick={onClick}
      className="p-4 rounded-xl border border-slate-100 hover:border-brand-200 hover:shadow-sm cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center">
          <span className="text-brand-700 font-bold text-sm">{initials}</span>
        </div>
        <span className={`badge text-xs ${isActif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {isActif ? 'Actif' : status || 'Inactif'}
        </span>
      </div>
      <div className="font-semibold text-sm text-slate-900 truncate mb-1">{name}</div>
      <div className="text-xs text-slate-400 mb-2">{profil}</div>
      {lastAction && <p className="text-xs text-slate-400 truncate">Dernière action : {lastAction}</p>}
    </div>
  )
}

function QueueItem({ record }) {
  const fields = record.fields || {}
  const name = fields['Task Name / Reference'] || fields['Name'] || record.id
  const type = fields['Task Type'] || ''
  const status = fields['Status'] || ''
  const date = record.createdTime || ''

  const typeIcons = {
    rapport: '📊', revision_balance: '🔍', saisie_factures: '📝',
    relance_clients: '📬', revision_fournisseur: '🔍',
  }
  const icon = typeIcons[type] || '⚙️'

  return (
    <div className="flex items-start gap-4 py-3 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-base flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{name}</p>
        {type && <span className="text-xs text-slate-400">{type.replace(/_/g, ' ')}</span>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {date && <span className="text-xs text-slate-400">{new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>}
        {status.toLowerCase().includes('done') || status.toLowerCase().includes('terminé')
          ? <CheckCircle size={14} className="text-emerald-500" />
          : status.toLowerCase().includes('error')
          ? <AlertTriangle size={14} className="text-red-500" />
          : <Clock size={14} className="text-slate-300" />}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [queue, setQueue] = useState([])
  const [alertes, setAlertes] = useState([])
  const [loading, setLoading] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  const load = () => {
    setLoading(true)
    Promise.all([
      listRecords(TBL_CLIENTS).catch(() => []),
      listRecords(TBL_QUEUE).catch(() => []),
      listRecords(TBL_ALERTES).catch(() => []),
    ]).then(([c, q, a]) => {
      setClients(c)
      setQueue(q.slice(0, 5))
      setAlertes(a)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const recentClients = clients.slice(0, 4)
  const alertCount = alertes.filter(a => {
    const s = (a.fields?.['Alert Status'] || '').toLowerCase()
    return !s.includes('résolu') && !s.includes('resolved')
  }).length

  return (
    <div>
      <Header
        title={`${greeting} 👋`}
        subtitle={`Tableau de bord — ${cabinetName}`}
        actions={
          <button onClick={() => navigate('/comptamind')} className="btn-primary flex items-center gap-2">
            <Bot size={16} />
            Lancer ComptaMind
          </button>
        }
      />

      <div className="p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users} label="Dossiers actifs" value={loading ? '…' : clients.length}
            sub="Dans Airtable"
            color="bg-brand-100 text-brand-600"
          />
          <StatCard
            icon={FileText} label="Tâches récentes" value={loading ? '…' : queue.length}
            sub="Queue ComptaMind"
            color="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            icon={AlertTriangle} label="Alertes actives" value={loading ? '…' : alertCount}
            sub="Incohérences détectées"
            color="bg-amber-100 text-amber-600"
          />
          <StatCard
            icon={CheckCircle} label="Connexion VPS" value="OK"
            sub="Backend opérationnel"
            color="bg-violet-100 text-violet-600"
          />
        </div>

        {/* Alertes Airtable */}
        {alertCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
              <div>
                <span className="text-amber-800 font-semibold text-sm">
                  {alertCount} alerte{alertCount > 1 ? 's' : ''} détectée{alertCount > 1 ? 's' : ''} dans Airtable
                </span>
                <p className="text-amber-700 text-xs mt-0.5">Consultez la page Rapports pour les détails</p>
              </div>
            </div>
            <button onClick={() => navigate('/rapports')} className="btn-ghost text-amber-700 text-sm font-medium flex items-center gap-1">
              Voir <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Grille principale */}
        <div className="grid grid-cols-3 gap-6">
          {/* Activité récente */}
          <div className="col-span-2 card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Activité ComptaMind</h2>
                <p className="text-xs text-slate-500 mt-0.5">Dernières tâches de la queue</p>
              </div>
              <button onClick={load} className="btn-ghost text-sm flex items-center gap-1">
                <RefreshCw size={14} />
                Actualiser
              </button>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                Chargement Airtable…
              </div>
            )}

            {!loading && queue.length === 0 && (
              <p className="text-slate-400 text-sm py-4">Aucune tâche dans la queue pour l'instant.</p>
            )}

            {!loading && queue.map(r => <QueueItem key={r.id} record={r} />)}

            <button onClick={() => navigate('/rapports')} className="mt-4 w-full py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors flex items-center justify-center gap-1">
              Voir tous les rapports <ChevronRight size={14} />
            </button>
          </div>

          {/* Panneau droit */}
          <div className="space-y-4">
            {/* Actions rapides */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Actions rapides</h3>
              <div className="space-y-2">
                {[
                  { label: 'Saisie factures', icon: '📝', desc: 'Traitement des À traiter', action: () => navigate('/comptamind') },
                  { label: 'Révision balance', icon: '🔍', desc: 'Contrôler les comptes', action: () => navigate('/comptamind') },
                  { label: 'Relances clients', icon: '📬', desc: 'Balance âgée en retard', action: () => navigate('/comptamind') },
                ].map((item, i) => (
                  <button key={i} onClick={item.action} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group">
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-700">{item.label}</div>
                      <div className="text-xs text-slate-400">{item.desc}</div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500" />
                  </button>
                ))}
              </div>
            </div>

            {/* Statut ComptaMind */}
            <div className="card p-5 gradient-brand text-white">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={18} />
                <h3 className="text-sm font-bold">ComptaMind</h3>
                <div className="ml-auto w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              </div>
              <p className="text-indigo-200 text-xs mb-3">
                Backend VPS actif · Airtable connecté · Pennylane intégré
              </p>
              <div className="flex items-center gap-1 text-indigo-200 text-xs">
                <Star size={12} className="fill-current text-yellow-300" />
                <span>Opérationnel</span>
              </div>
            </div>
          </div>
        </div>

        {/* Aperçu dossiers Airtable */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Dossiers</h2>
              <p className="text-xs text-slate-500 mt-0.5">{loading ? 'Chargement…' : `${clients.length} dossier${clients.length > 1 ? 's' : ''} dans Airtable`}</p>
            </div>
            <button onClick={() => navigate('/clients')} className="btn-secondary text-sm flex items-center gap-1">
              Tous les dossiers <ArrowRight size={14} />
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              Connexion Airtable…
            </div>
          )}

          {!loading && clients.length === 0 && (
            <div className="text-center py-8">
              <Building2 size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Aucun dossier dans Airtable</p>
              <p className="text-slate-400 text-xs mt-1">Vérifiez VITE_AIRTABLE_TOKEN dans Netlify</p>
            </div>
          )}

          {!loading && recentClients.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {recentClients.map(r => (
                <ClientCard key={r.id} record={r} onClick={() => navigate('/clients')} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
