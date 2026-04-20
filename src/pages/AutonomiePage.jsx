import { useState } from 'react'
import {
  Bot, Clock, CheckCircle, X, AlertTriangle, Play, Pause,
  Plus, Trash2, Zap, Calendar, ChevronRight, Bell, Shield
} from 'lucide-react'
import Header from '../components/layout/Header'
import { useAppStore } from '../store/useAppStore'
import { useNavigate } from 'react-router-dom'

const triggerLabels = {
  monthly: 'Mensuel',
  weekly: 'Hebdomadaire',
  quarterly: 'Trimestriel',
  after_saisie: 'Après chaque saisie',
  on_document: 'À réception de documents',
}

const actionLabels = {
  saisie_mensuelle: 'Saisie mensuelle',
  revision_balance: 'Révision balance',
  relances_niveau1: 'Relances niveau 1',
  relances_niveau2: 'Relances niveau 2',
  cloture_exercice: 'Clôture exercice',
  export_fec: 'Export FEC',
}

const priorityConfig = {
  haute: { color: 'text-red-600 bg-red-50 border-red-100', dot: 'bg-red-500', label: 'Priorité haute' },
  moyenne: { color: 'text-amber-600 bg-amber-50 border-amber-100', dot: 'bg-amber-500', label: 'Priorité moyenne' },
  basse: { color: 'text-blue-600 bg-blue-50 border-blue-100', dot: 'bg-blue-500', label: 'Priorité basse' },
}

function ApprovalCard({ approval, onApprove, onReject }) {
  const [loading, setLoading] = useState(null)
  const prio = priorityConfig[approval.priority] || priorityConfig.basse

  const timeAgo = () => {
    const diff = Date.now() - new Date(approval.requestedAt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `il y a ${mins} min`
    const hours = Math.floor(mins / 60)
    return `il y a ${hours}h`
  }

  const handleApprove = async () => {
    setLoading('approve')
    await new Promise(r => setTimeout(r, 800))
    onApprove(approval.id)
  }

  const handleReject = async () => {
    setLoading('reject')
    await new Promise(r => setTimeout(r, 500))
    onReject(approval.id)
  }

  return (
    <div className={`rounded-xl border p-5 ${prio.color} animate-slide-up`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{approval.icon}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900">{approval.titre}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${prio.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                {prio.label}
              </span>
            </div>
            <span className="text-xs text-slate-400">{approval.clientNom} · {timeAgo()}</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-3 leading-relaxed">{approval.description}</p>

      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 bg-white/60 rounded-lg px-3 py-2">
        <AlertTriangle size={12} className="flex-shrink-0" />
        <span><strong>Impact :</strong> {approval.impact}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {loading === 'approve' ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckCircle size={15} />
          )}
          Approuver
        </button>
        <button
          onClick={handleReject}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {loading === 'reject' ? (
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          ) : (
            <X size={15} />
          )}
          Refuser
        </button>
      </div>
    </div>
  )
}

function TaskCard({ task, onToggle, onDelete }) {
  const isActive = task.status === 'active'
  const nextRunDate = task.nextRun ? new Date(task.nextRun).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : null
  const lastRunDate = task.lastRun ? new Date(task.lastRun).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'Jamais'
  const clientsLabel = task.clientIds === 'all' ? 'Tous les clients' : `${task.clientIds.length} client(s)`

  return (
    <div className={`card p-5 transition-all ${isActive ? 'border-emerald-100 bg-emerald-50/30' : 'opacity-60'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive ? 'bg-emerald-100' : 'bg-slate-100'}`}>
            <Zap size={16} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">{task.label}</div>
            <div className="text-xs text-slate-400">{task.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {isActive ? '● Actif' : '○ En pause'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/80 rounded-lg p-2.5 text-center">
          <div className="text-xs text-slate-400 mb-0.5">Déclencheur</div>
          <div className="text-xs font-semibold text-slate-700">{triggerLabels[task.trigger] || task.trigger}</div>
        </div>
        <div className="bg-white/80 rounded-lg p-2.5 text-center">
          <div className="text-xs text-slate-400 mb-0.5">Prochaine exéc.</div>
          <div className="text-xs font-semibold text-slate-700">{nextRunDate || '—'}</div>
        </div>
        <div className="bg-white/80 rounded-lg p-2.5 text-center">
          <div className="text-xs text-slate-400 mb-0.5">Exécutions</div>
          <div className="text-xs font-semibold text-slate-700">{task.runsCount} fois</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{clientsLabel} · Dernière : {lastRunDate}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={() => onToggle(task.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isActive
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
          >
            {isActive ? <><Pause size={11} /> Mettre en pause</> : <><Play size={11} /> Réactiver</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddTaskModal({ onClose, onSave }) {
  const [form, setForm] = useState({ label: '', action: 'saisie_mensuelle', trigger: 'monthly', triggerDay: 10, clientIds: 'all' })
  const { clients } = useAppStore()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Nouvelle tâche autonome</h2>
          <p className="text-sm text-slate-500 mt-1">ComptaMind exécutera cette tâche automatiquement</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Nom de la tâche</label>
            <input className="input" placeholder="ex: Saisie mensuelle automatique"
              value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Action</label>
              <select className="input" value={form.action} onChange={e => setForm({...form, action: e.target.value})}>
                {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Déclencheur</label>
              <select className="input" value={form.trigger} onChange={e => setForm({...form, trigger: e.target.value})}>
                {Object.entries(triggerLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          {(form.trigger === 'monthly' || form.trigger === 'quarterly') && (
            <div>
              <label className="label">Jour du déclenchement</label>
              <input type="number" min="1" max="28" className="input" value={form.triggerDay}
                onChange={e => setForm({...form, triggerDay: parseInt(e.target.value)})} />
            </div>
          )}
          <div>
            <label className="label">Clients concernés</label>
            <select className="input" value={form.clientIds} onChange={e => setForm({...form, clientIds: e.target.value})}>
              <option value="all">Tous les clients actifs</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={() => { onSave(form); onClose() }} disabled={!form.label} className="btn-primary">
            <Plus size={15} /> Créer la tâche
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AutonomiePage() {
  const [showAddTask, setShowAddTask] = useState(false)
  const { pendingApprovals, autonomousTasks, approveAction, rejectAction, toggleAutonomousTask, deleteAutonomousTask, addAutonomousTask } = useAppStore()
  const navigate = useNavigate()

  const activeTasks = autonomousTasks.filter(t => t.status === 'active')
  const pausedTasks = autonomousTasks.filter(t => t.status === 'paused')

  return (
    <div>
      <Header
        title="Mode Autonome"
        subtitle="Gérez les tâches automatiques et les demandes d'approbation de ComptaMind"
        actions={
          <button onClick={() => setShowAddTask(true)} className="btn-primary">
            <Plus size={16} /> Nouvelle tâche autonome
          </button>
        }
      />

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Tâches actives', value: activeTasks.length, icon: '⚡', color: 'bg-emerald-50' },
            { label: 'En pause', value: pausedTasks.length, icon: '⏸️', color: 'bg-slate-50' },
            { label: 'En attente d\'approbation', value: pendingApprovals.length, icon: '⏳', color: pendingApprovals.length > 0 ? 'bg-amber-50' : 'bg-slate-50' },
            { label: 'Total exécutions', value: autonomousTasks.reduce((s, t) => s + t.runsCount, 0), icon: '✅', color: 'bg-blue-50' },
          ].map((s, i) => (
            <div key={i} className={`card p-4 ${s.color}`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Left: Pending approvals */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={16} className="text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">En attente d'approbation</h2>
              {pendingApprovals.length > 0 && (
                <span className="w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {pendingApprovals.length}
                </span>
              )}
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-slate-600 font-medium text-sm">Tout est approuvé</p>
                <p className="text-slate-400 text-xs mt-1">Aucune décision en attente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map(approval => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    onApprove={approveAction}
                    onReject={rejectAction}
                  />
                ))}
              </div>
            )}

            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Shield size={13} className="text-slate-500" />
                <span className="text-xs font-semibold text-slate-600">Gérer les autorisations</span>
              </div>
              <p className="text-xs text-slate-400 mb-2">Configurez ce que ComptaMind peut faire seul pour éviter ces approbations.</p>
              <button onClick={() => navigate('/autorisations')} className="btn-secondary text-xs py-1.5 w-full">
                Paramétrer les autorisations <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {/* Right: Autonomous tasks */}
          <div className="col-span-3">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-brand-500" />
              <h2 className="text-base font-bold text-slate-900">Tâches programmées</h2>
            </div>

            {autonomousTasks.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="text-4xl mb-3">🤖</div>
                <p className="text-slate-600 font-medium">Aucune tâche programmée</p>
                <p className="text-slate-400 text-sm mt-1 mb-5">Créez des tâches pour que ComptaMind travaille automatiquement</p>
                <button onClick={() => setShowAddTask(true)} className="btn-primary mx-auto">
                  <Plus size={15} /> Créer la première tâche
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {autonomousTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={toggleAutonomousTask}
                    onDelete={deleteAutonomousTask}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddTask && (
        <AddTaskModal onClose={() => setShowAddTask(false)} onSave={addAutonomousTask} />
      )}
    </div>
  )
}
