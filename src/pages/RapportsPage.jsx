import { useState, useEffect } from 'react'
import { FileText, RefreshCw, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import Header from '../components/layout/Header'
import { listRecords } from '../lib/airtable'
import { TBL_QUEUE, TBL_ALERTES } from '../lib/airtable-schema'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status) {
  if (!status) return null
  const s = String(status).toLowerCase()
  if (s.includes('done') || s.includes('terminé') || s.includes('success')) {
    return <span className="badge text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1"><CheckCircle size={12} />Terminé</span>
  }
  if (s.includes('error') || s.includes('erreur')) {
    return <span className="badge text-red-700 bg-red-50 border border-red-200 flex items-center gap-1"><AlertCircle size={12} />Erreur</span>
  }
  if (s.includes('progress') || s.includes('cours')) {
    return <span className="badge text-blue-700 bg-blue-50 border border-blue-200 flex items-center gap-1">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />En cours
    </span>
  }
  return <span className="badge text-slate-600 bg-slate-100">{status}</span>
}

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Carte rapport ─────────────────────────────────────────────────────────

function ReportCard({ record }) {
  const [expanded, setExpanded] = useState(false)
  const fields = record.fields || {}

  const title  = fields['Task Name / Reference'] || fields['Name'] || fields['Alert Name'] || record.id
  const type   = fields['Task Type'] || fields['Type'] || fields['Alert Type'] || ''
  const status = fields['Status'] || fields['Alert Status'] || ''
  const logs   = fields['Execution Logs'] || fields['Sync Logs'] || fields['Recommendation'] || ''
  const date   = fields['Created'] || record.createdTime || ''
  const dossier = Array.isArray(fields['Dossier']) ? fields['Dossier'][0] : (fields['Dossier'] || '')

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText size={16} className="text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{title}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {type && <span className="badge">{type}</span>}
              {dossier && <span className="badge text-brand-700 bg-brand-50 border border-brand-200">{dossier}</span>}
              {statusBadge(status)}
            </div>
            {date && <p className="text-xs text-slate-400 mt-1">{formatDate(date)}</p>}
          </div>
        </div>
        {logs && (
          <button onClick={() => setExpanded(!expanded)} className="btn-ghost p-1.5 flex-shrink-0">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {expanded && logs && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap break-words font-sans leading-relaxed max-h-96 overflow-auto bg-slate-50 rounded-lg p-3">
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

  const current = tab === 'queue' ? queueRecords : alerteRecords
  const total   = queueRecords.length + alerteRecords.length

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="Rapports & Activité"
        subtitle={loading ? 'Chargement…' : `${total} entrée${total > 1 ? 's' : ''} au total`}
        actions={
          <button onClick={load} disabled={loading} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Onglets */}
        <div className="flex bg-slate-100 rounded-xl p-1 max-w-sm">
          <button
            onClick={() => setTab('queue')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'queue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Queue travail ({queueRecords.length})
          </button>
          <button
            onClick={() => setTab('alertes')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'alertes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Alertes ({alerteRecords.length})
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <p className="font-semibold mb-1">Impossible de charger les données</p>
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-slate-500">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            Connexion à Airtable…
          </div>
        )}

        {!loading && current.length === 0 && !error && (
          <div className="text-center py-16">
            <Clock size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucune entrée pour l'instant</p>
            <p className="text-slate-400 text-sm mt-1">Les résultats apparaîtront ici après chaque run ComptaMind.</p>
          </div>
        )}

        <div className="space-y-3">
          {current.map(r => <ReportCard key={r.id} record={r} />)}
        </div>
      </div>
    </div>
  )
}
