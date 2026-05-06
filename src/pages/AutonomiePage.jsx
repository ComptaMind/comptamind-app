import { useState } from 'react'
import {
  Bot, CheckCircle, X, AlertTriangle, Play, Pause,
  Plus, Trash2, Zap, Bell, Shield, ArrowRight,
  RefreshCw, ChevronRight, Clock, Sparkles
} from 'lucide-react'
import Header from '../components/layout/Header'
import { useAppStore } from '../store/useAppStore'
import { useNavigate } from 'react-router-dom'
import { useAirtableClients } from '../hooks/useAirtableClients'
import { useT } from '../hooks/useT'

// ─── Labels métier ────────────────────────────────────────────────────────────

const triggerLabelsEn = {
  monthly: 'Every month',
  weekly: 'Every week',
  quarterly: 'Every quarter',
  after_saisie: 'After each entry',
  on_document: 'Upon document receipt',
}

const triggerLabelsFr = {
  monthly: 'Chaque mois',
  weekly: 'Chaque semaine',
  quarterly: 'Chaque trimestre',
  after_saisie: 'Après chaque saisie',
  on_document: 'À réception de document',
}

const actionOutcomesEn = {
  saisie_mensuelle: { label: 'Monthly entry', outcome: 'Accounting updated automatically', icon: '📝' },
  revision_balance: { label: 'Balance sheet review', outcome: 'Anomalies detected before closing', icon: '🔍' },
  relances_niveau1: { label: 'Friendly reminders', outcome: 'Receivables recovered effortlessly', icon: '💬' },
  relances_niveau2: { label: 'Formal notices', outcome: 'Accelerated collection (30–60 days)', icon: '📬' },
  cloture_exercice: { label: 'Year-end closing', outcome: 'Year closed with validation', icon: '🔒' },
  export_fec: { label: 'FEC export', outcome: 'FEC always available', icon: '📤' },
}

const actionOutcomesFr = {
  saisie_mensuelle: { label: 'Saisie mensuelle', outcome: 'Comptabilité mise à jour automatiquement', icon: '📝' },
  revision_balance: { label: 'Révision balance', outcome: 'Anomalies détectées avant clôture', icon: '🔍' },
  relances_niveau1: { label: 'Relances douces', outcome: 'Créances recouvrées sans effort', icon: '💬' },
  relances_niveau2: { label: 'Mises en demeure', outcome: 'Recouvrement accéléré (30–60 jours)', icon: '📬' },
  cloture_exercice: { label: 'Clôture exercice', outcome: 'Exercice clôturé avec validation', icon: '🔒' },
  export_fec: { label: 'Export FEC', outcome: 'FEC toujours disponible', icon: '📤' },
}

const priorityConfigEn = {
  haute:   { dot: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50 border-red-200',   label: 'Urgent' },
  moyenne: { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'High' },
  basse:   { dot: 'bg-blue-400',  text: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200',  label: 'Normal' },
}

const priorityConfigFr = {
  haute:   { dot: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50 border-red-200',   label: 'Urgent' },
  moyenne: { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Haute' },
  basse:   { dot: 'bg-blue-400',  text: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200',  label: 'Normale' },
}

// ─── Carte d'approbation ──────────────────────────────────────────────────────

function ApprovalCard({ approval, onApprove, onReject }) {
  const t = useT()
  const [loading, setLoading] = useState(null)
  const priorityConfig = t(priorityConfigEn, priorityConfigFr)
  const prio = priorityConfig[approval.priority] || priorityConfig.basse

  const timeAgo = () => {
    const diff = Date.now() - new Date(approval.requestedAt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return t('Just now', "À l'instant")
    if (mins < 60) return t(`${mins} min ago`, `il y a ${mins} min`)
    return t(`${Math.floor(mins / 60)}h ago`, `il y a ${Math.floor(mins / 60)}h`)
  }

  const handleApprove = async () => {
    setLoading('approve')
    await new Promise(r => setTimeout(r, 600))
    onApprove(approval.id)
  }

  const handleReject = async () => {
    setLoading('reject')
    await new Promise(r => setTimeout(r, 400))
    onReject(approval.id)
  }

  return (
    <div className={`rounded-2xl border p-5 animate-slide-up ${prio.bg}`}>
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl flex-shrink-0">{approval.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-bold text-slate-900">{approval.titre}</span>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${prio.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
              {prio.label}
            </span>
          </div>
          <p className="text-xs text-slate-500">{approval.clientNom} · {timeAgo()}</p>
        </div>
      </div>

      <p className="text-sm text-slate-700 mb-3 leading-relaxed">{approval.description}</p>

      <div className="bg-white/70 rounded-xl px-3 py-2 mb-4 flex items-start gap-2">
        <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-600"><strong>Impact: </strong>{approval.impact}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {loading === 'approve'
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <CheckCircle size={14} />
          }
          {t('Approve', 'Approuver')}
        </button>
        <button
          onClick={handleReject}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {loading === 'reject'
            ? <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
            : <X size={14} />
          }
          {t('Reject', 'Rejeter')}
        </button>
      </div>
    </div>
  )
}

// ─── Carte de tâche autonome ──────────────────────────────────────────────────

function TaskCard({ task, onToggle, onDelete }) {
  const t = useT()
  const actionOutcomes = t(actionOutcomesEn, actionOutcomesFr)
  const triggerLabels = t(triggerLabelsEn, triggerLabelsFr)
  const isActive = task.status === 'active'
  const info = actionOutcomes[task.action] || { label: task.label, outcome: '', icon: '⚡' }
  const nextRunDate = task.nextRun
    ? new Date(task.nextRun).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    : null
  const clientsLabel = task.clientIds === 'all' ? t('All client files', 'Tous les dossiers clients') : `${task.clientIds.length} ${t('file(s)', 'dossier(s)')}`

  return (
    <div className={`rounded-2xl border p-5 transition-all ${isActive ? 'bg-white border-emerald-100' : 'bg-slate-50 border-slate-100 opacity-70'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isActive ? 'bg-emerald-50' : 'bg-slate-100'}`}>
            {info.icon}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{task.label || info.label}</p>
            {info.outcome && (
              <p className="text-xs text-slate-500">{info.outcome}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            {isActive ? t('Active', 'Actif') : t('Paused', 'En pause')}
          </span>
          <button onClick={() => onDelete(task.id)} className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
          <p className="text-xs text-slate-400 mb-0.5">{t('Frequency', 'Fréquence')}</p>
          <p className="text-xs font-semibold text-slate-700">{triggerLabels[task.trigger] || task.trigger}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
          <p className="text-xs text-slate-400 mb-0.5">{t('Next run', 'Prochaine exécution')}</p>
          <p className="text-xs font-semibold text-slate-700">{nextRunDate || '—'}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
          <p className="text-xs text-slate-400 mb-0.5">{t('Executions', 'Exécutions')}</p>
          <p className="text-xs font-semibold text-slate-700">{task.runsCount} {t('times', 'fois')}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{clientsLabel}</span>
        <button
          onClick={() => onToggle(task.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            isActive
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          }`}
        >
          {isActive ? <><Pause size={11} /> {t('Pause', 'Pause')}</> : <><Play size={11} /> {t('Activate', 'Activer')}</>}
        </button>
      </div>
    </div>
  )
}

// ─── Modal nouvelle tâche ─────────────────────────────────────────────────────

function AddTaskModal({ onClose, onSave }) {
  const t = useT()
  const actionOutcomes = t(actionOutcomesEn, actionOutcomesFr)
  const triggerLabels = t(triggerLabelsEn, triggerLabelsFr)
  const [form, setForm] = useState({ label: '', action: 'saisie_mensuelle', trigger: 'monthly', triggerDay: 10, clientIds: 'all' })
  const { clients } = useAirtableClients()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('New automation', 'Nouvelle automatisation')}</h2>
              <p className="text-sm text-slate-500">{t('ComptaMind will run this task without intervention', 'ComptaMind exécutera cette tâche sans intervention')}</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">{t("Automation name", "Nom de l'automatisation")}</label>
            <input className="input" placeholder={t("e.g.: Monthly entry ATALAO", "ex : Saisie mensuelle ATALAO")}
              value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('Task', 'Tâche')}</label>
              <select className="input" value={form.action} onChange={e => setForm({...form, action: e.target.value})}>
                {Object.entries(actionOutcomes).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('Frequency', 'Fréquence')}</label>
              <select className="input" value={form.trigger} onChange={e => setForm({...form, trigger: e.target.value})}>
                {Object.entries(triggerLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          {(form.trigger === 'monthly' || form.trigger === 'quarterly') && (
            <div>
              <label className="label">{t('Day of the month', 'Jour du mois')}</label>
              <input type="number" min="1" max="28" className="input" value={form.triggerDay}
                onChange={e => setForm({...form, triggerDay: parseInt(e.target.value)})} />
            </div>
          )}
          <div>
            <label className="label">{t('Client files', 'Dossiers clients')}</label>
            <select className="input" value={form.clientIds} onChange={e => setForm({...form, clientIds: e.target.value})}>
              <option value="all">{t('All active client files', 'Tous les dossiers clients actifs')}</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          {form.action && actionOutcomes[form.action] && (
            <div className="rounded-xl bg-brand-50 border border-brand-100 px-4 py-3 flex items-center gap-2.5">
              <Sparkles size={14} className="text-brand-500 flex-shrink-0" />
              <p className="text-xs text-brand-700"><strong>{t('Expected outcome: ', 'Résultat attendu : ')}</strong>{actionOutcomes[form.action].outcome}</p>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">{t('Cancel', 'Annuler')}</button>
          <button onClick={() => { onSave(form); onClose() }} disabled={!form.label} className="btn-primary">
            <Zap size={14} /> {t('Create automation', "Créer l'automatisation")}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AutonomiePage() {
  const t = useT()
  const actionOutcomes = t(actionOutcomesEn, actionOutcomesFr)
  const [showAddTask, setShowAddTask] = useState(false)
  const { pendingApprovals, autonomousTasks, approveAction, rejectAction, toggleAutonomousTask, deleteAutonomousTask, addAutonomousTask } = useAppStore()
  const navigate = useNavigate()

  const activeTasks  = autonomousTasks.filter(t => t.status === 'active')
  const pausedTasks  = autonomousTasks.filter(t => t.status === 'paused')
  const totalRuns    = autonomousTasks.reduce((s, t) => s + t.runsCount, 0)

  return (
    <div>
      <Header
        title={t('Autonomous Mode', 'Mode Autonome')}
        subtitle={t('ComptaMind works for you, in the background', 'ComptaMind travaille pour vous, en arrière-plan')}
        actions={
          <button onClick={() => setShowAddTask(true)} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> {t('New automation', 'Nouvelle automatisation')}
          </button>
        }
      />

      <div className="p-8">

        {/* ── Approbations en attente ── */}
        {pendingApprovals.length > 0 && (
          <div className="mb-8">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Bell size={16} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900">
                    {t(`${pendingApprovals.length} action${pendingApprovals.length > 1 ? 's' : ''} require${pendingApprovals.length > 1 ? '' : 's'} your approval`, `${pendingApprovals.length} action${pendingApprovals.length > 1 ? 's' : ''} requière${pendingApprovals.length > 1 ? 'nt' : ''} votre approbation`)}
                  </p>
                  <p className="text-xs text-amber-700">{t('ComptaMind is waiting for your decision to continue', 'ComptaMind attend votre décision pour continuer')}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {pendingApprovals.map(approval => (
                <ApprovalCard key={approval.id} approval={approval} onApprove={approveAction} onReject={rejectAction} />
              ))}
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: t('Active', 'Actif'), value: activeTasks.length, icon: Zap, color: 'text-emerald-600 bg-emerald-50', sub: t('Automations running', 'Automatisations en cours') },
            { label: t('Paused', 'En pause'), value: pausedTasks.length, icon: Pause, color: 'text-slate-400 bg-slate-50', sub: t('Temporarily stopped', 'Temporairement arrêtées') },
            { label: t('Pending', 'En attente'), value: pendingApprovals.length, icon: Bell, color: pendingApprovals.length > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-400 bg-slate-50', sub: t('Decisions required', 'Décisions requises') },
            { label: t('Total runs', 'Exécutions totales'), value: totalRuns, icon: CheckCircle, color: 'text-brand-600 bg-brand-50', sub: t('Successful executions', 'Exécutions réussies') },
          ].map((s, i) => (
            <div key={i} className="card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                <s.icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs font-medium text-slate-600">{s.label}</p>
                <p className="text-xs text-slate-400">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-6">

          {/* ── Tâches programmées ── */}
          <div className="col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{t('Scheduled automations', 'Automatisations programmées')}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{t('ComptaMind runs these tasks without intervention', 'ComptaMind exécute ces tâches sans intervention')}</p>
              </div>
            </div>

            {autonomousTasks.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
                  <Bot size={28} className="text-white" />
                </div>
                <p className="text-slate-700 font-semibold text-base mb-1">{t('No automations created', 'Aucune automatisation créée')}</p>
                <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6">
                  {t('Create automations so ComptaMind handles entry, review and reminders — without any intervention from you.', 'Créez des automatisations pour que ComptaMind gère la saisie, la révision et les relances — sans aucune intervention de votre part.')}
                </p>
                <div className="space-y-2 mb-6 text-left max-w-xs mx-auto">
                  {Object.values(actionOutcomes).slice(0, 3).map((o, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-500">
                      <span>{o.icon}</span>
                      <span>{o.outcome}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowAddTask(true)} className="btn-primary mx-auto">
                  <Plus size={15} /> {t('Create my first automation', 'Créer ma première automatisation')}
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
                <button
                  onClick={() => setShowAddTask(true)}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-semibold text-slate-400 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={15} /> {t('Add an automation', 'Ajouter une automatisation')}
                </button>
              </div>
            )}
          </div>

          {/* ── Panneau droit ── */}
          <div className="col-span-2 space-y-4">
            {/* Approbations vides */}
            {pendingApprovals.length === 0 && (
              <div className="card p-5 text-center">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={20} className="text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-slate-800 mb-1">{t('No decisions required', 'Aucune décision requise')}</p>
                <p className="text-xs text-slate-500">{t('ComptaMind is working autonomously. Everything is under control.', 'ComptaMind fonctionne en autonomie. Tout est sous contrôle.')}</p>
              </div>
            )}

            {/* Raccourci autorisations */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className="text-brand-500" />
                <span className="text-xs font-bold text-slate-700">{t('Configure permissions', 'Configurer les autorisations')}</span>
              </div>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                {t('Define exactly what ComptaMind can do on its own — to avoid repeated approval requests.', 'Définissez exactement ce que ComptaMind peut faire seul — pour éviter les demandes d\'approbation répétées.')}
              </p>
              <button
                onClick={() => navigate('/autorisations')}
                className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
              >
                {t('Manage permissions', 'Gérer les autorisations')} <ChevronRight size={12} />
              </button>
            </div>

            {/* Accès rapide IA */}
            <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)', border: '1px solid #e0e7ff' }}>
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-brand-500" />
                <span className="text-xs font-bold text-brand-900">{t('Run manually', 'Exécuter manuellement')}</span>
              </div>
              <p className="text-xs text-brand-700 leading-relaxed">
                {t('Need to run a task immediately on a specific client file?', 'Besoin d\'exécuter une tâche immédiatement sur un dossier client ?')}
              </p>
              <button
                onClick={() => navigate('/comptamind')}
                className="w-full py-2 rounded-xl gradient-brand text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <Bot size={13} /> {t('Open ComptaMind AI', 'Ouvrir ComptaMind IA')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddTask && (
        <AddTaskModal onClose={() => setShowAddTask(false)} onSave={addAutonomousTask} />
      )}
    </div>
  )
}
