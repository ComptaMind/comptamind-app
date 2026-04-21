import { useState, useRef, useEffect } from 'react'
import {
  Send, Bot, User, ChevronDown, Play,
  CheckCircle, AlertTriangle, Download, Clock,
  Sparkles, ArrowRight, FileText, RefreshCw, ChevronUp
} from 'lucide-react'
import Header from '../components/layout/Header'
import { listRecords, getRecord } from '../lib/airtable'
import { runTask as callVPS } from '../lib/api'
import { EXCLUDED_CLIENT_IDS } from '../hooks/useAirtableClients'
import {
  TBL_CLIENTS, TBL_QUEUE,
  FLD_CLIENT_NAME, FLD_TASK_STATUS, FLD_TASK_LOGS
} from '../lib/airtable-schema'

// ─── Maps ─────────────────────────────────────────────────────────────────────

const TACHE_MAP = {
  saisie:        'saisie_factures',
  revision:      'revision_balance',
  rev_fourn:     'revision_fournisseur',
  rev_client:    'revision_client',
  rapport:       'rapport',
  rapprochement: 'rapprochement_bancaire',
  relances:      'relance_clients',
}

const TASK_LABELS = {
  saisie:        'Saisie des factures',
  revision:      'Révision par la balance',
  rev_fourn:     'Révision fournisseur',
  rev_client:    'Révision client',
  rapport:       'Rapport',
  rapprochement: 'Rapprochement bancaire',
  relances:      'Relances clients',
}

// ─── Actions copilot ──────────────────────────────────────────────────────────

const COPILOT_ACTIONS = [
  {
    id: 'saisie',
    icon: '📝',
    label: 'Saisie des factures',
    outcome: 'Traiter les pièces en attente et mettre la comptabilité à jour',
    detail: 'Récupère les factures Pennylane et les saisit automatiquement dans les bons comptes.',
    accent: 'blue',
    priority: true,
  },
  {
    id: 'revision',
    icon: '🔍',
    label: 'Révision par la balance',
    outcome: 'Contrôler les comptes 1 à 7 et détecter les anomalies',
    detail: 'Analyse la balance générale, vérifie les lettrage et signale les incohérences.',
    accent: 'purple',
    priority: true,
  },
  {
    id: 'rev_fourn',
    icon: '📋',
    label: 'Révision fournisseurs',
    outcome: 'Vérifier les soldes 401, FNP et charges à payer',
    detail: 'Contrôle le cycle fournisseur : balance auxiliaire, factures non parvenues, cut-off.',
    accent: 'indigo',
    priority: false,
  },
  {
    id: 'rapprochement',
    icon: '🏦',
    label: 'Rapprochement bancaire',
    outcome: 'Lettrer les opérations non rapprochées et fiabiliser la trésorerie',
    detail: 'Compare les relevés bancaires avec les écritures comptables et lettre les opérations.',
    accent: 'emerald',
    priority: false,
  },
  {
    id: 'rapport',
    icon: '📊',
    label: 'Rapport de situation',
    outcome: 'Générer un rapport complet sur l\'état du dossier',
    detail: 'Synthèse de la situation comptable, indicateurs clés et points d\'attention.',
    accent: 'teal',
    priority: false,
  },
  {
    id: 'relances',
    icon: '📬',
    label: 'Relances clients',
    outcome: 'Identifier et relancer les créances en retard',
    detail: 'Analyse la balance âgée clients et prépare les relances selon les délais.',
    accent: 'amber',
    priority: false,
  },
]

const accentStyles = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',   btn: 'bg-blue-600 hover:bg-blue-700',   ghost: 'text-blue-600 hover:bg-blue-50',   badge: 'bg-blue-100 text-blue-700' },
  purple:  { bg: 'bg-purple-50',  border: 'border-purple-200', btn: 'bg-purple-600 hover:bg-purple-700', ghost: 'text-purple-600 hover:bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200', btn: 'bg-indigo-600 hover:bg-indigo-700', ghost: 'text-indigo-600 hover:bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', btn: 'bg-emerald-600 hover:bg-emerald-700', ghost: 'text-emerald-600 hover:bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
  teal:    { bg: 'bg-teal-50',    border: 'border-teal-200',   btn: 'bg-teal-600 hover:bg-teal-700',   ghost: 'text-teal-600 hover:bg-teal-50',   badge: 'bg-teal-100 text-teal-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',  btn: 'bg-amber-600 hover:bg-amber-700', ghost: 'text-amber-600 hover:bg-amber-50',  badge: 'bg-amber-100 text-amber-700' },
}

// ─── Détection NLP ────────────────────────────────────────────────────────────

function detectIntent(text) {
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const rapportMatch = text.match(/rapport\s+(?:sur\s+|de\s+|pour\s+)?([A-Z][A-Z0-9\s\-_']+)/i)
  if (rapportMatch) return { tache: 'rapport', fournisseur: rapportMatch[1].trim().toUpperCase() }
  if (t.includes('rapport')) return { tache: 'rapport', fournisseur: '' }
  if ((t.includes('fournisseur') && t.includes('revision')) || t.includes('revision fournisseur'))
    return { tache: 'rev_fourn', fournisseur: '' }
  if ((t.includes('client') && t.includes('revision')) || t.includes('revision client'))
    return { tache: 'rev_client', fournisseur: '' }
  if (/\bsaisie\b/.test(t))             return { tache: 'saisie',        fournisseur: '' }
  if (/\brevision\b|\bbalance\b/.test(t)) return { tache: 'revision',    fournisseur: '' }
  if (/\brapprochement\b/.test(t))      return { tache: 'rapprochement', fournisseur: '' }
  if (/\brelance/.test(t) || /\bimpaye/.test(t)) return { tache: 'relances', fournisseur: '' }
  return null
}

// ─── Export markdown ──────────────────────────────────────────────────────────

function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── AI Copilot Panel ─────────────────────────────────────────────────────────

function AICopilotPanel({ clientName, clientExercice, onLaunch, disabled }) {
  const [expandedId, setExpandedId] = useState(null)

  if (!clientName) {
    return (
      <div className="bg-white border-b border-slate-100 px-8 py-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
            <Sparkles size={24} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Sélectionnez un dossier pour commencer</h2>
          <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto">
            ComptaMind analysera le dossier et vous proposera les actions prioritaires : saisie, révision, rapport, relances.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {COPILOT_ACTIONS.slice(0, 4).map(a => (
              <span key={a.id} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                {a.icon} {a.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-b border-slate-100 px-8 py-5">
      {/* Briefing IA */}
      <div className="flex items-center gap-3 mb-4 max-w-5xl">
        <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0">
          <Sparkles size={14} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">
            Actions disponibles pour <span className="text-brand-600">{clientName}</span>
            <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Exercice {clientExercice}</span>
          </p>
          <p className="text-xs text-slate-500">Cliquez sur <strong>Appliquer</strong> pour lancer une action, ou utilisez la zone de texte ci-dessous pour une instruction personnalisée.</p>
        </div>
      </div>

      {/* Grille actions */}
      <div className="grid grid-cols-3 gap-3 max-w-5xl">
        {COPILOT_ACTIONS.map(action => {
          const s = accentStyles[action.accent]
          const isExpanded = expandedId === action.id
          return (
            <div key={action.id} className={`rounded-xl border p-4 transition-all ${s.bg} ${s.border} ${action.priority ? 'ring-1 ring-brand-200' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{action.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{action.label}</p>
                    {action.priority && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${s.badge}`}>Recommandé</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-3">{action.outcome}</p>

              {isExpanded && (
                <div className="bg-white/70 rounded-lg px-3 py-2 mb-3 border border-white">
                  <p className="text-xs text-slate-500 leading-relaxed">{action.detail}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onLaunch(action.id)}
                  disabled={disabled}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${s.btn}`}
                >
                  <Play size={11} /> Appliquer
                </button>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : action.id)}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${s.ghost}`}
                  title="Voir les détails"
                >
                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Indicateur de réflexion ──────────────────────────────────────────────────

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 mt-1">
        <Bot size={16} className="text-white" />
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" />
          <span className="text-slate-400 text-sm ml-1">ComptaMind réfléchit...</span>
        </div>
      </div>
    </div>
  )
}

// ─── Animation de progression ─────────────────────────────────────────────────

function TaskProgress({ task }) {
  const [step, setStep] = useState(0)
  const label = TASK_LABELS[task.tache] || task.tache
  const detail = task.fournisseur ? `${label} — ${task.fournisseur}` : label
  const steps = [
    { id: 1, label: 'Connexion à Pennylane', duration: 1200 },
    { id: 2, label: `${detail} en cours...`, duration: 3000 },
    { id: 3, label: 'Génération du rapport', duration: 800 },
  ]
  useEffect(() => {
    const timers = []
    steps.forEach((s, i) => {
      timers.push(setTimeout(() => setStep(i + 1), steps.slice(0, i).reduce((acc, s2) => acc + s2.duration, 600)))
    })
    return () => timers.forEach(clearTimeout)
  }, [])
  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 mt-1">
        <Bot size={16} className="text-white" />
      </div>
      <div className="flex-1 bg-white border border-slate-100 rounded-2xl rounded-tl-sm p-5 shadow-sm max-w-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-slate-900">{task.title}</div>
          <div className="flex items-center gap-1 text-xs text-brand-600">
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />En cours...
          </div>
        </div>
        <div className="space-y-2">
          {steps.map((s, i) => {
            const done = step > i + 1
            const active = step === i + 1
            return (
              <div key={s.id} className={`flex items-center gap-3 text-sm transition-all ${done ? 'text-slate-600' : active ? 'text-slate-800' : 'text-slate-300'}`}>
                {done ? <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                  : active ? <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  : <div className="w-3.5 h-3.5 rounded-full border border-slate-200 flex-shrink-0" />}
                <span className={active ? 'font-medium' : ''}>{s.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Bloc Run + polling Airtable ──────────────────────────────────────────────

function RunBlock({ runId, airtableRecordId, tache, clientNom, fournisseur, error }) {
  const [pollingStatus, setPollingStatus] = useState('waiting')
  const [reportContent, setReportContent] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const label = TASK_LABELS[tache] || tache

  useEffect(() => {
    if (!airtableRecordId || error) return
    const tick = setInterval(() => setElapsed(e => e + 10), 10000)
    const poll = setInterval(async () => {
      try {
        const rec = await getRecord(TBL_QUEUE, airtableRecordId)
        const status = (rec.fields?.[FLD_TASK_STATUS] || '').toLowerCase()
        const logs = rec.fields?.[FLD_TASK_LOGS] || ''
        if (status.includes('done') || status.includes('terminé') || status.includes('success')) {
          setReportContent(logs); setPollingStatus('done')
          clearInterval(poll); clearInterval(tick)
        } else if (status.includes('error') || status.includes('erreur')) {
          setReportContent(logs || 'Erreur lors de l\'exécution.')
          setPollingStatus('error')
          clearInterval(poll); clearInterval(tick)
        }
      } catch (_) {}
    }, 10000)
    return () => { clearInterval(poll); clearInterval(tick) }
  }, [airtableRecordId, error])

  if (error) {
    return (
      <div className="flex items-start gap-3 animate-slide-up">
        <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 mt-1">
          <Bot size={16} className="text-white" />
        </div>
        <div className="flex-1 bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm p-5 shadow-sm max-w-lg">
          <div className="flex items-center gap-2 font-bold text-red-800 mb-2">
            <AlertTriangle size={16} /> Erreur lors du lancement
          </div>
          <p className="text-sm text-red-700">{error}</p>
          <p className="text-xs text-red-500 mt-2">Vérifiez que le VPS est accessible et que le dossier existe dans Airtable.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 mt-1">
        <Bot size={16} className="text-white" />
      </div>
      <div className="flex-1 max-w-lg space-y-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl rounded-tl-sm p-4 shadow-sm">
          <div className="font-bold text-emerald-800 mb-1">
            ✅ {label}{fournisseur ? ` — ${fournisseur}` : ''} lancée sur {clientNom}
          </div>
          {runId && <p className="text-xs text-emerald-700 font-mono">Run ID : {runId}</p>}
        </div>

        {pollingStatus === 'waiting' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span>En attente du rapport Airtable... {elapsed > 0 && `(${elapsed}s)`}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Le rapport sera affiché ici dès que ComptaMind a terminé (1–5 min).</p>
          </div>
        )}

        {(pollingStatus === 'done' || pollingStatus === 'error') && reportContent && (
          <div className={`rounded-2xl p-4 shadow-sm border ${pollingStatus === 'done' ? 'bg-white border-slate-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-900">
                {pollingStatus === 'done' ? '📄 Rapport disponible' : '⚠️ Rapport (avec erreurs)'}
              </span>
              <button
                onClick={() => downloadMarkdown(reportContent, `rapport-${clientNom}-${tache}-${new Date().toISOString().slice(0,10)}.md`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold rounded-lg hover:bg-brand-100 transition-colors"
              >
                <Download size={12} /> Télécharger .md
              </button>
            </div>
            <pre className="text-xs text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto bg-slate-50 rounded-lg p-3 font-mono">
              {reportContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Message simple ───────────────────────────────────────────────────────────

function Message({ msg }) {
  if (msg.type === 'user') {
    return (
      <div className="flex items-start gap-3 justify-end animate-slide-up">
        <div className="bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-sm shadow-sm">
          <p className="text-sm">{msg.text}</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot size={16} className="text-slate-600" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 mt-1">
        <Bot size={16} className="text-white" />
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-lg">
        <p className="text-sm text-slate-700 whitespace-pre-line">{msg.text}</p>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ComptaMindPage() {
  const [airtableClients, setAirtableClients] = useState([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [thinking, setThinking] = useState(false)
  const [runningTask, setRunningTask] = useState(null)
  const [runBlock, setRunBlock] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    listRecords(TBL_CLIENTS)
      .then(all => setAirtableClients(all.filter(r => !EXCLUDED_CLIENT_IDS.has(r.id))))
      .catch(() => {})
      .finally(() => setLoadingClients(false))
  }, [])

  const selectedClient = airtableClients.find(c => c.id === selectedClientId)
  const clientName = selectedClient?.fields?.[FLD_CLIENT_NAME] || selectedClient?.fields?.['Client Name'] || ''

  const clientExercice = (() => {
    const f = selectedClient?.fields || {}
    if (f['Exercice en cours']) return String(f['Exercice en cours'])
    const profil = f['Profil comptable'] || f['Profil détail JSON'] || ''
    const m = String(profil).match(/20\d\d/)
    if (m) return m[0]
    return String(new Date().getFullYear())
  })()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking, runningTask, runBlock])

  useEffect(() => {
    setMessages([{
      id: 'welcome',
      type: 'assistant',
      text: clientName
        ? `Prêt pour **${clientName}** (exercice ${clientExercice}). Utilisez les boutons ci-dessus pour lancer une action, ou tapez une instruction personnalisée.`
        : 'Sélectionnez un dossier pour voir les actions disponibles.',
    }])
    setRunningTask(null)
    setRunBlock(null)
  }, [selectedClientId])

  const addMsg = (type, text) =>
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), type, text }])

  const launchTask = async (tache, fournisseur = '') => {
    if (!clientName) return
    const label = TASK_LABELS[tache] || tache
    const vtache = TACHE_MAP[tache] || tache
    const title = `${label}${fournisseur ? ` — ${fournisseur}` : ''} · ${clientName}`

    addMsg('assistant', `Lancement de **${label}**${fournisseur ? ` sur ${fournisseur}` : ''} pour **${clientName}** (exercice ${clientExercice}).\nConnexion au VPS...`)
    setRunningTask({ tache, title, fournisseur })
    setRunBlock(null)

    try {
      const res = await callVPS({ client: clientName, tache: vtache, exercice: clientExercice, fournisseur })
      setTimeout(() => {
        setRunningTask(null)
        setRunBlock({
          runId: res.run_id || res.airtable_record_id,
          airtableRecordId: res.airtable_record_id || res.run_id,
          tache, clientNom: clientName, fournisseur, error: null,
        })
      }, 5500)
    } catch (e) {
      setTimeout(() => {
        setRunningTask(null)
        setRunBlock({ runId: null, airtableRecordId: null, tache, clientNom: clientName, fournisseur, error: e.message })
      }, 2000)
    }
  }

  const handleSend = () => {
    if (!input.trim() || runningTask) return
    const text = input.trim()
    setInput('')
    addMsg('user', text)
    setThinking(true)
    const intent = detectIntent(text)
    setTimeout(() => {
      setThinking(false)
      if (!selectedClientId) {
        addMsg('assistant', "Veuillez d'abord sélectionner un dossier dans le menu ci-dessus.")
        return
      }
      if (intent) {
        launchTask(intent.tache, intent.fournisseur)
      } else {
        addMsg('assistant',
          "Instruction non reconnue. Exemples :\n• \"Saisie\" — factures en attente\n• \"Révision balance\" — comptes 1 à 7\n• \"Révision fournisseur\" — cycle 40x\n• \"Rapport LECLERC\" — rapport fournisseur\n• \"Relances\" — créances en retard"
        )
      }
    }, 900)
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const isTaskRunning = !!runningTask

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="ComptaMind IA"
        subtitle="Votre copilote comptable"
        actions={
          <div className="flex items-center gap-3">
            {/* Sélecteur dossier dans le header */}
            <div className="relative">
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 min-w-56"
              >
                <option value="">— Choisir un dossier —</option>
                {loadingClients && <option disabled>Chargement...</option>}
                {airtableClients.map(c => {
                  const name = c.fields?.[FLD_CLIENT_NAME] || c.fields?.['Client Name'] || c.id
                  return <option key={c.id} value={c.id}>{name}</option>
                })}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-700 text-xs font-semibold">IA active</span>
            </div>
          </div>
        }
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── AI Copilot Panel (core experience) ── */}
        <AICopilotPanel
          clientName={clientName}
          clientExercice={clientExercice}
          onLaunch={launchTask}
          disabled={isTaskRunning}
        />

        {/* ── Chat / Résultats ── */}
        <div className="flex-1 overflow-y-auto px-8 py-5 space-y-4 bg-slate-50">
          {messages.map(msg => <Message key={msg.id} msg={msg} />)}
          {thinking && <ThinkingIndicator />}
          {runningTask && <TaskProgress task={runningTask} />}
          {runBlock && <RunBlock {...runBlock} />}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Zone texte (instructions personnalisées) ── */}
        <div className="bg-white border-t border-slate-100 px-8 py-4">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={clientName
                  ? `Instruction pour ${clientName} — ex: "rapport LECLERC", "révision fournisseur", "relances"...`
                  : "Sélectionnez d'abord un dossier..."}
                rows={1}
                style={{ resize: 'none', maxHeight: '120px' }}
                className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTaskRunning}
              className="w-11 h-11 gradient-brand rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-sm"
            >
              <Send size={18} className="text-white" />
            </button>
          </div>
          <p className="text-center text-xs text-slate-400 mt-2">
            Instruction personnalisée — ou utilisez les boutons <strong>Appliquer</strong> ci-dessus pour une action directe.
          </p>
        </div>
      </div>
    </div>
  )
}
