import { useState, useEffect } from 'react'
import {
  FileText, RefreshCw, CheckCircle, AlertCircle, Clock,
  ChevronDown, ChevronUp, Download, AlertTriangle, Zap, CircleDot
} from 'lucide-react'
import Header from '../components/layout/Header'
import { listRecords } from '../lib/airtable'
import { TBL_QUEUE, TBL_ALERTES } from '../lib/airtable-schema'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function getTaskStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('done') || s.includes('terminé') || s.includes('success'))
    return { label: 'Done', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle }
  if (s.includes('error') || s.includes('erreur'))
    return { label: 'Error', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', icon: AlertCircle }
  if (s.includes('progress') || s.includes('cours'))
    return { label: 'In progress', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400 animate-pulse', icon: Clock }
  return { label: status || 'Pending', color: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400', icon: CircleDot }
}

const typeLabels = {
  revision_balance: 'Balance review',
  saisie_factures: 'Invoice entry',
  revision_fournisseur: 'Supplier review',
  revision_client: 'Client review',
  relance_clients: 'Client reminders',
  rapport: 'Report',
  rapprochement_bancaire: 'Bank reconciliation',
}

// ─── Summary Banner ───────────────────────────────────────────────────────────

function SummaryBanner({ queue, alertes }) {
  const done = queue.filter(r => {
    const s = (r.fields?.['Status'] || '').toLowerCase()
    return s.includes('done') || s.includes('terminé') || s.includes('success')
  }).length
  const errors = queue.filter(r => {
    const s = (r.fields?.['Status'] || '').toLowerCase()
    return s.includes('error') || s.includes('erreur')
  }).length
  const openAlertes = alertes.filter(a => {
    const s = (a.fields?.['Alert Status'] || '').toLowerCase()
    return !s.includes('résolu') && !s.includes('resolved')
  }).length

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <CheckCircle size={16} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-700">{done}</p>
          <p className="text-xs text-emerald-600 font-medium">opération{done > 1 ? 's' : ''} corrigée{done > 1 ? 's' : ''}</p>
          <p className="text-xs text-emerald-500 mt-0.5">{done > 0 ? 'Traitées avec succès' : 'Aucune exécution'}</p>
        </div>
      </div>
      <div className={`rounded-xl p-4 border flex items-center gap-3 ${errors > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${errors > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
          <AlertCircle size={16} className={errors > 0 ? 'text-red-600' : 'text-slate-400'} />
        </div>
        <div>
          <p className={`text-2xl font-bold ${errors > 0 ? 'text-red-700' : 'text-slate-400'}`}>{errors}</p>
          <p className={`text-xs font-medium ${errors > 0 ? 'text-red-600' : 'text-slate-400'}`}>action{errors > 1 ? 's' : ''} en attente de correction</p>
          <p className={`text-xs mt-0.5 ${errors > 0 ? 'text-red-500' : 'text-slate-400'}`}>{errors > 0 ? 'À relancer via ComptaMind IA' : 'Aucune erreur'}</p>
        </div>
      </div>
      <div className={`rounded-xl p-4 border flex items-center gap-3 ${openAlertes > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${openAlertes > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
          <AlertTriangle size={16} className={openAlertes > 0 ? 'text-amber-600' : 'text-slate-400'} />
        </div>
        <div>
          <p className={`text-2xl font-bold ${openAlertes > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{openAlertes}</p>
          <p className={`text-xs font-medium ${openAlertes > 0 ? 'text-amber-600' : 'text-slate-400'}`}>anomalie{openAlertes > 1 ? 's' : ''} à traiter</p>
          <p className={`text-xs mt-0.5 ${openAlertes > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{openAlertes > 0 ? 'Détectées par ComptaMind' : 'Aucune anomalie'}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Report Card ─────────────────────────────────────────────────────────────

function ReportCard({ record, isAlert }) {
  const [expanded, setExpanded] = useState(false)
  const fields = record.fields || {}

  const title    = fields['Task Name / Reference'] || fields['Name'] || fields['Alert Name'] || record.id
  const type     = fields['Task Type'] || fields['Type'] || fields['Alert Type'] || ''
  const status   = fields['Status'] || fields['Alert Status'] || ''
  const logs     = fields['Execution Logs'] || fields['Sync Logs'] || fields['Recommendation'] || ''
  const date     = fields['Created'] || record.createdTime || ''
  const dossier  = Array.isArray(fields['Dossier']) ? fields['Dossier'][0] : (fields['Dossier'] || '')
  const severity = fields['Severity'] || fields['Alert Severity'] || ''

  const st   = getTaskStatus(status)
  const Icon = st.icon

  const severityBadge = {
    haute: 'bg-red-100 text-red-700',
    élevé: 'bg-red-100 text-red-700',
    moyenne: 'bg-amber-100 text-amber-700',
    basse: 'bg-blue-100 text-blue-700',
    faible: 'bg-blue-100 text-blue-700',
  }

  const handleDownload = () => {
    if (!logs) return
    const blob = new Blob([logs], { type: 'text/markdown;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `rapport-${title.slice(0, 30).replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`bg-white rounded-xl border transition-all hover:shadow-sm ${expanded ? 'border-brand-200 shadow-sm' : 'border-slate-100'}`}>
      <div className="flex items-start gap-3 p-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${isAlert ? 'bg-amber-50' : 'bg-brand-50'}`}>
          {isAlert
            ? <AlertTriangle size={15} className="text-amber-600" />
            : <FileText size={15} className="text-brand-600" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="font-semibold text-slate-900 text-sm truncate">{typeLabels[type] || title}</p>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${st.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              {st.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {type && (
              <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">{type.replace(/_/g, ' ')}</span>
            )}
            {dossier && (
              <span className="text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-md">{dossier}</span>
            )}
            {severity && severityBadge[severity.toLowerCase()] && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${severityBadge[severity.toLowerCase()]}`}>
                Sévérité {severity}
              </span>
            )}
          </div>

          {date && <p className="text-xs text-slate-400 mt-1.5">{formatDate(date)}</p>}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {logs && (
            <button
              onClick={handleDownload}
              title="Télécharger le rapport"
              className="p-1.5 text-slate-300 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            >
              <Download size={14} />
            </button>
          )}
          {logs && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {expanded && logs && (
        <div className="px-4 pb-4 border-t border-slate-50 pt-3">
          <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-80 overflow-auto bg-slate-50 rounded-xl p-4">
            {logs}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function RapportsPage() {
  const [queueRecords, setQueueRecords]   = useState([])
  const [alerteRecords, setAlerteRecords] = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [tab, setTab]                     = useState('queue')

  async function load() {
    setLoading(true); setError('')
    try {
      const [queue, alertes] = await Promise.all([
        listRecords(TBL_QUEUE),
        listRecords(TBL_ALERTES),
      ])
      setQueueRecords(queue)
      setAlerteRecords(alertes)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAlertes = alerteRecords.filter(a => {
    const s = (a.fields?.['Alert Status'] || '').toLowerCase()
    return !s.includes('résolu') && !s.includes('resolved')
  })
  const current = tab === 'queue' ? queueRecords : alerteRecords

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="Rapports & Activité"
        subtitle={loading ? 'Chargement…' : `${queueRecords.length} tâche${queueRecords.length > 1 ? 's' : ''} · ${alerteRecords.length} alerte${alerteRecords.length > 1 ? 's' : ''}`}
        actions={
          <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        }
      />

      <div className="p-6">
        {!loading && <SummaryBanner queue={queueRecords} alertes={alerteRecords} />}

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-5 w-fit">
          <button
            onClick={() => setTab('queue')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'queue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Zap size={13} />
            Tâches
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === 'queue' ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-500'}`}>
              {queueRecords.length}
            </span>
          </button>
          <button
            onClick={() => setTab('alertes')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'alertes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <AlertTriangle size={13} />
            Alertes
            {openAlertes.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">
                {openAlertes.length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm mb-4">
            <p className="font-semibold text-red-800 mb-1">Impossible de charger les données</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-slate-400 py-6">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Connexion à Airtable…</span>
          </div>
        )}

        {!loading && current.length === 0 && !error && (
          <div className="card text-center py-20">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-600 font-semibold mb-1">
              {tab === 'queue' ? 'Aucune tâche exécutée' : 'Aucune alerte détectée'}
            </p>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              {tab === 'queue'
                ? 'Les tâches ComptaMind apparaîtront ici après chaque exécution.'
                : 'ComptaMind signalera ici les anomalies détectées dans vos dossiers.'
              }
            </p>
          </div>
        )}

        {!loading && current.length > 0 && (
          <div className="space-y-2">
            {current.map(r => (
              <ReportCard key={r.id} record={r} isAlert={tab === 'alertes'} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
