import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle, Clock, ArrowRight,
  ChevronRight, RefreshCw, Building2, Zap, Bot,
  Play, Sparkles, CircleDot, Wrench, Eye, RotateCcw
} from 'lucide-react'
import Header from '../components/layout/Header'
import { listRecords } from '../lib/airtable'
import {
  TBL_CLIENTS, TBL_QUEUE, TBL_ALERTES,
  FLD_CLIENT_NAME, FLD_CLIENT_STATUS, FLD_CLIENT_PROFIL, FLD_CLIENT_LAST_ACTION
} from '../lib/airtable-schema'
import { EXCLUDED_CLIENT_IDS } from '../hooks/useAirtableClients'
import { useAppStore } from '../store/useAppStore'
import { useT } from '../hooks/useT'

const cabinetName = import.meta.env.VITE_CABINET_NAME || 'votre cabinet'

// ─── Priority Action Card ─────────────────────────────────────────────────────

function PriorityCard({ level, icon: Icon, iconColor, bg, border, title, description, count, primaryCta, primaryCtaIcon: CtaIcon, secondaryCta, secondaryCtaIcon: Cta2Icon, onPrimary, onSecondary }) {
  const ctaColor = level === 'urgent'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : level === 'warning'
    ? 'bg-amber-500 hover:bg-amber-600 text-white'
    : 'bg-brand-600 hover:bg-brand-700 text-white'

  const ghostColor = level === 'urgent'
    ? 'text-red-600 hover:bg-red-50 border-red-200'
    : level === 'warning'
    ? 'text-amber-600 hover:bg-amber-50 border-amber-200'
    : 'text-brand-600 hover:bg-brand-50 border-brand-200'

  return (
    <div className={`relative rounded-2xl border p-5 transition-all hover:shadow-md ${bg} ${border}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon size={18} />
        </div>
        {count > 0 && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${level === 'urgent' ? 'bg-red-100 text-red-700' : level === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
            {count}
          </span>
        )}
      </div>
      <p className="font-semibold text-slate-900 text-sm mb-1">{title}</p>
      <p className="text-xs text-slate-500 leading-relaxed mb-4">{description}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrimary}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${ctaColor}`}
        >
          {CtaIcon && <CtaIcon size={12} />}
          {primaryCta}
        </button>
        {secondaryCta && (
          <button
            onClick={onSecondary}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-white transition-colors ${ghostColor}`}
          >
            {Cta2Icon && <Cta2Icon size={12} />}
            {secondaryCta}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Client Card ─────────────────────────────────────────────────────────────

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
      className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 cursor-pointer transition-all group"
    >
      <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-xs">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-900 truncate">{name}</p>
        {profil && <p className="text-xs text-slate-400 truncate">{profil}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`w-2 h-2 rounded-full ${isActif ? 'bg-emerald-400' : 'bg-slate-300'}`} />
        <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
      </div>
    </div>
  )
}

// ─── Activity Item ────────────────────────────────────────────────────────────

function ActivityItem({ record }) {
  const t = useT()
  const fields = record.fields || {}
  const name = fields['Task Name / Reference'] || fields['Name'] || record.id
  const type = fields['Task Type'] || ''
  const status = (fields['Status'] || '').toLowerCase()
  const date = record.createdTime || ''

  const isDone = status.includes('done') || status.includes('terminé') || status.includes('success')
  const isError = status.includes('error') || status.includes('erreur')
  const isProgress = status.includes('progress') || status.includes('cours')

  const typeLabel = {
    revision_balance: t('Balance review', 'Révision balance'),
    saisie_factures: t('Invoice entry', 'Saisie factures'),
    revision_fournisseur: t('Supplier review', 'Révision fournisseur'),
    revision_client: t('Client review', 'Révision client'),
    relance_clients: t('Client reminders', 'Relances clients'),
    rapport: t('Report', 'Rapport'),
    rapprochement_bancaire: t('Reconciliation', 'Rapprochement bancaire'),
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-50' : isError ? 'bg-red-50' : 'bg-slate-100'}`}>
        {isDone
          ? <CheckCircle size={13} className="text-emerald-500" />
          : isError
          ? <AlertTriangle size={13} className="text-red-500" />
          : <CircleDot size={13} className="text-slate-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{typeLabel[type] || name}</p>
        {date && <p className="text-xs text-slate-400">{new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
      </div>
      {isDone && <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">{t('Done', 'Terminé')}</span>}
      {isError && <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full flex-shrink-0">{t('Error', 'Erreur')}</span>}
      {isProgress && <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full flex-shrink-0">{t('In progress', 'En cours')}</span>}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { pendingApprovals } = useAppStore()
  const t = useT()
  const [clients, setClients] = useState([])
  const [queue, setQueue] = useState([])
  const [alertes, setAlertes] = useState([])
  const [loading, setLoading] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('Good morning', 'Bonjour') : hour < 18 ? t('Good afternoon', 'Bon après-midi') : t('Good evening', 'Bonsoir')

  const load = () => {
    setLoading(true)
    Promise.all([
      listRecords(TBL_CLIENTS).catch(() => []),
      listRecords(TBL_QUEUE).catch(() => []),
      listRecords(TBL_ALERTES).catch(() => []),
    ]).then(([c, q, a]) => {
      setClients(c.filter(r => !EXCLUDED_CLIENT_IDS.has(r.id)))
      setQueue(q.slice(0, 8))
      setAlertes(a)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Derived insights from real data
  const openAlertes = alertes.filter(a => {
    const s = (a.fields?.['Alert Status'] || '').toLowerCase()
    return !s.includes('résolu') && !s.includes('resolved')
  })
  const errorTasks = queue.filter(r => {
    const s = (r.fields?.['Status'] || '').toLowerCase()
    return s.includes('error') || s.includes('erreur')
  })
  const doneTasks = queue.filter(r => {
    const s = (r.fields?.['Status'] || '').toLowerCase()
    return s.includes('done') || s.includes('terminé') || s.includes('success')
  })
  const recentClients = clients.slice(0, 5)

  const allGood = openAlertes.length === 0 && errorTasks.length === 0 && pendingApprovals.length === 0

  return (
    <div>
      <Header
        title={`${greeting} 👋`}
        subtitle={`Dashboard — ${cabinetName}`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={load} className="btn-ghost text-sm flex items-center gap-1.5">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {t('Refresh', 'Actualiser')}
            </button>
            <button onClick={() => navigate('/comptamind')} className="btn-primary flex items-center gap-2">
              <Bot size={15} />
              {t('Launch ComptaMind AI', 'Lancer ComptaMind IA')}
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-8 max-w-7xl">

        {/* ── AI Morning Briefing ── */}
        <div className="rounded-2xl p-5 flex items-start gap-4" style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)', border: '1px solid #e0e7ff' }}>
          <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900 text-sm mb-1">
              {loading ? t('Analyzing…', 'Analyse en cours…') : allGood
                ? t(`All good — ${clients.length} active client${clients.length > 1 ? 's' : ''}, no anomalies detected.`, `Tout est en ordre — ${clients.length} client${clients.length > 1 ? 's' : ''} actif${clients.length > 1 ? 's' : ''}, aucune anomalie détectée.`)
                : t(`${openAlertes.length + errorTasks.length + pendingApprovals.length} item${openAlertes.length + errorTasks.length + pendingApprovals.length > 1 ? 's' : ''} need${openAlertes.length + errorTasks.length + pendingApprovals.length > 1 ? '' : 's'} your attention today.`, `${openAlertes.length + errorTasks.length + pendingApprovals.length} élément${openAlertes.length + errorTasks.length + pendingApprovals.length > 1 ? 's' : ''} requièrent votre attention aujourd'hui.`)
              }
            </p>
            <p className="text-xs text-slate-500">
              {doneTasks.length > 0 ? `${doneTasks.length} ComptaMind task${doneTasks.length > 1 ? 's' : ''} completed · ` : ''}
              {clients.length} client{clients.length > 1 ? 's' : ''} in Airtable
            </p>
          </div>
          <button onClick={() => navigate('/comptamind')} className="flex-shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            {t('Open AI', 'Ouvrir IA')} <ArrowRight size={12} />
          </button>
        </div>

        {/* ── Priority Actions ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{t('Priorities', 'Priorités')}</h2>
            {allGood && !loading && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                <CheckCircle size={13} /> {t('No action required', 'Aucune action requise')}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <PriorityCard
              level={openAlertes.length > 0 ? 'urgent' : 'ok'}
              icon={openAlertes.length > 0 ? AlertTriangle : CheckCircle}
              iconColor={openAlertes.length > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}
              bg={openAlertes.length > 0 ? 'bg-red-50/60' : 'bg-white'}
              border={openAlertes.length > 0 ? 'border-red-200' : 'border-slate-100'}
              title={openAlertes.length > 0 ? t(`${openAlertes.length} anomal${openAlertes.length > 1 ? 'ies' : 'y'} detected`, `${openAlertes.length} anomalie${openAlertes.length > 1 ? 's' : ''} détectée${openAlertes.length > 1 ? 's' : ''}`) : t('No anomalies', 'Aucune anomalie')}
              description={openAlertes.length > 0 ? t('Inconsistencies were detected in your files. Review and fix them now.', 'Des incohérences ont été détectées dans vos dossiers. Révisez et corrigez-les.') : t('All your files are compliant. No inconsistencies detected.', 'Tous vos dossiers sont conformes. Aucune incohérence détectée.')}
              count={openAlertes.length}
              primaryCta={openAlertes.length > 0 ? t('Review', 'Réviser') : t('See reports', 'Voir rapports')}
              primaryCtaIcon={openAlertes.length > 0 ? Eye : Eye}
              secondaryCta={openAlertes.length > 0 ? t('Fix with AI', 'Corriger avec IA') : null}
              secondaryCtaIcon={openAlertes.length > 0 ? Wrench : null}
              onPrimary={() => navigate('/rapports')}
              onSecondary={() => navigate('/comptamind')}
            />
            <PriorityCard
              level={errorTasks.length > 0 ? 'warning' : 'ok'}
              icon={errorTasks.length > 0 ? Clock : CheckCircle}
              iconColor={errorTasks.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}
              bg={errorTasks.length > 0 ? 'bg-amber-50/60' : 'bg-white'}
              border={errorTasks.length > 0 ? 'border-amber-200' : 'border-slate-100'}
              title={errorTasks.length > 0 ? t(`${errorTasks.length} failed task${errorTasks.length > 1 ? 's' : ''}`, `${errorTasks.length} tâche${errorTasks.length > 1 ? 's' : ''} en erreur`) : t('Queue error-free', 'File sans erreur')}
              description={errorTasks.length > 0 ? t('Some ComptaMind tasks failed. Check the details and rerun.', 'Certaines tâches ComptaMind ont échoué. Consultez les détails et relancez.') : t('All recent tasks completed successfully.', 'Toutes les tâches récentes ont réussi.')}
              count={errorTasks.length}
              primaryCta={errorTasks.length > 0 ? t('See details', 'Voir détails') : t('See activity', "Voir l'activité")}
              primaryCtaIcon={Eye}
              secondaryCta={errorTasks.length > 0 ? t('Rerun', 'Relancer') : null}
              secondaryCtaIcon={errorTasks.length > 0 ? RotateCcw : null}
              onPrimary={() => navigate('/rapports')}
              onSecondary={() => navigate('/comptamind')}
            />
            <PriorityCard
              level={pendingApprovals.length > 0 ? 'warning' : 'ok'}
              icon={pendingApprovals.length > 0 ? Zap : CheckCircle}
              iconColor={pendingApprovals.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}
              bg={pendingApprovals.length > 0 ? 'bg-blue-50/60' : 'bg-white'}
              border={pendingApprovals.length > 0 ? 'border-blue-200' : 'border-slate-100'}
              title={pendingApprovals.length > 0 ? t(`${pendingApprovals.length} approval${pendingApprovals.length > 1 ? 's' : ''} required`, `${pendingApprovals.length} approbation${pendingApprovals.length > 1 ? 's' : ''} requise${pendingApprovals.length > 1 ? 's' : ''}`) : t('Fully automated', 'Entièrement automatisé')}
              description={pendingApprovals.length > 0 ? t('ComptaMind is waiting for your approval. Approve or reject each action.', 'ComptaMind attend votre approbation. Approuvez ou rejetez chaque action.') : t('ComptaMind is running autonomously. No decision required.', 'ComptaMind fonctionne en autonomie. Aucune décision requise.')}
              count={pendingApprovals.length}
              primaryCta={pendingApprovals.length > 0 ? t('Approve', 'Approuver') : t('Manage autonomy', "Gérer l'autonomie")}
              primaryCtaIcon={pendingApprovals.length > 0 ? CheckCircle : Zap}
              secondaryCta={pendingApprovals.length > 0 ? t('Auto-resolve', 'Résolution auto') : null}
              secondaryCtaIcon={pendingApprovals.length > 0 ? Zap : null}
              onPrimary={() => navigate('/autonomie')}
              onSecondary={() => navigate('/autorisations')}
            />
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: t('Active clients', 'Clients actifs'),
              value: loading ? '…' : clients.length,
              sub: t('Connected to Airtable', 'Connecté à Airtable'),
              icon: Building2,
              color: 'text-brand-600 bg-brand-50',
            },
            {
              label: t('Tasks executed', 'Tâches exécutées'),
              value: loading ? '…' : queue.length,
              sub: t('Since the beginning', 'Depuis le début'),
              icon: CheckCircle,
              color: 'text-emerald-600 bg-emerald-50',
            },
            {
              label: t('Open anomalies', 'Anomalies ouvertes'),
              value: loading ? '…' : openAlertes.length,
              sub: openAlertes.length > 0 ? t('To handle', 'À traiter') : t('All good', 'Tout est bon'),
              icon: AlertTriangle,
              color: openAlertes.length > 0 ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-50',
            },
            {
              label: t('ComptaMind AI', 'ComptaMind IA'),
              value: t('Active', 'Actif'),
              sub: t('VPS + Airtable connected', 'VPS + Airtable connectés'),
              icon: Bot,
              color: 'text-violet-600 bg-violet-50',
            },
          ].map((s, i) => (
            <div key={i} className="card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                <s.icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 leading-none">{s.value}</p>
                <p className="text-xs font-medium text-slate-600 mt-0.5">{s.label}</p>
                <p className="text-xs text-slate-400">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-5 gap-6">

          {/* Activité récente */}
          <div className="col-span-3 card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{t('ComptaMind Activity', 'Activité ComptaMind')}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{t('Latest tasks executed', 'Dernières tâches exécutées')}</p>
              </div>
              <button onClick={() => navigate('/rapports')} className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                {t('See all', 'Voir tout')} <ChevronRight size={12} />
              </button>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                {t('Loading…', 'Chargement…')}
              </div>
            )}

            {!loading && queue.length === 0 && (
              <div className="text-center py-10">
                <Bot size={28} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">{t('No tasks executed yet', 'Aucune tâche exécutée')}</p>
                <p className="text-slate-400 text-xs mt-1 mb-4">{t('Launch your first task from ComptaMind AI', 'Lancez votre première tâche depuis ComptaMind IA')}</p>
                <button onClick={() => navigate('/comptamind')} className="btn-primary text-xs py-2 mx-auto">
                  <Play size={13} /> {t('Get started', 'Commencer')}
                </button>
              </div>
            )}

            {!loading && queue.map(r => <ActivityItem key={r.id} record={r} />)}
          </div>

          {/* Dossiers */}
          <div className="col-span-2 card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{t('Clients', 'Clients')}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {loading ? t('Loading…', 'Chargement…') : `${clients.length} client${clients.length > 1 ? 's' : ''}`}
                </p>
              </div>
              <button onClick={() => navigate('/clients')} className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                {t('All', 'Tous')} <ChevronRight size={12} />
              </button>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                {t('Connecting to Airtable…', 'Connexion à Airtable…')}
              </div>
            )}

            {!loading && clients.length === 0 && (
              <div className="text-center py-8">
                <Building2 size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">{t('No clients', 'Aucun client')}</p>
              </div>
            )}

            <div className="space-y-2">
              {recentClients.map(r => (
                <ClientCard key={r.id} record={r} onClick={() => navigate('/clients')} />
              ))}
            </div>

            {clients.length > 5 && (
              <button onClick={() => navigate('/clients')} className="w-full mt-3 py-2 text-xs font-semibold text-slate-500 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors flex items-center justify-center gap-1">
                +{clients.length - 5} {t('more clients', 'clients supplémentaires')} <ArrowRight size={11} />
              </button>
            )}

            {!loading && (
              <button
                onClick={() => navigate('/comptamind')}
                className="w-full mt-3 py-2.5 rounded-xl text-xs font-semibold gradient-brand text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Bot size={13} /> {t('Launch an AI task', 'Lancer une tâche IA')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
