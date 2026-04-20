import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Bot, User, ChevronDown,
  CheckCircle, FileText, AlertTriangle, ExternalLink, Download, Clock
} from 'lucide-react'
import Header from '../components/layout/Header'
import { listRecords, getRecord } from '../lib/airtable'
import { runTask as callVPS } from '../lib/api'
import {
  TBL_CLIENTS, TBL_QUEUE,
  FLD_CLIENT_NAME, FLD_TASK_STATUS, FLD_TASK_LOGS
} from '../lib/airtable-schema'

// ─── Mapping tâche locale → enum VPS ─────────────────────────────────────────

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

const quickActions = [
  { id: 'saisie',   label: 'Saisie',          icon: '📝', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
  { id: 'revision', label: 'Révision balance', icon: '🔍', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
  { id: 'rapport',  label: 'Rapport',          icon: '📊', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
  { id: 'relances', label: 'Relances',         icon: '📬', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
]

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

  if (/\bsaisie\b/.test(t))         return { tache: 'saisie',        fournisseur: '' }
  if (/\brevision\b|\bbalance\b/.test(t)) return { tache: 'revision',  fournisseur: '' }
  if (/\brapprochement\b/.test(t))  return { tache: 'rapprochement', fournisseur: '' }
  if (/\brelance/.test(t) || /\bimpaye/.test(t)) return { tache: 'relances', fournisseur: '' }

  return null
}

// ─── Export markdown ──────────────────────────────────────────────────────────

function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
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
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            En cours...
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

// ─── Bloc "Run lancé" + polling Airtable ─────────────────────────────────────

function RunBlock({ runId, airtableRecordId, tache, clientNom, fournisseur, error }) {
  const [pollingStatus, setPollingStatus] = useState('waiting') // waiting | done | error
  const [reportContent, setReportContent] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const label = TASK_LABELS[tache] || tache

  // Polling Airtable toutes les 10s pour récupérer le rapport
  useEffect(() => {
    if (!airtableRecordId || error) return

    const tick = setInterval(() => setElapsed(e => e + 10), 10000)

    const poll = setInterval(async () => {
      try {
        const rec = await getRecord(TBL_QUEUE, airtableRecordId)
        const status = (rec.fields?.[FLD_TASK_STATUS] || '').toLowerCase()
        const logs = rec.fields?.[FLD_TASK_LOGS] || ''

        if (status.includes('done') || status.includes('terminé') || status.includes('success')) {
          setReportContent(logs)
          setPollingStatus('done')
          clearInterval(poll)
          clearInterval(tick)
        } else if (status.includes('error') || status.includes('erreur')) {
          setReportContent(logs || 'Erreur lors de l\'exécution.')
          setPollingStatus('error')
          clearInterval(poll)
          clearInterval(tick)
        }
      } catch (_) { /* ignore erreurs polling */ }
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
            <AlertTriangle size={16} />Erreur lors du lancement
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
        {/* Confirmation lancement */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl rounded-tl-sm p-4 shadow-sm">
          <div className="font-bold text-emerald-800 mb-1">
            ✅ {label}{fournisseur ? ` — ${fournisseur}` : ''} lancée sur {clientNom}
          </div>
          {runId && <p className="text-xs text-emerald-700 font-mono">Run ID : {runId}</p>}
        </div>

        {/* Rapport en attente */}
        {pollingStatus === 'waiting' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span>En attente du rapport Airtable... {elapsed > 0 && `(${elapsed}s)`}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Le rapport sera affiché ici dès que ComptaMind a terminé (1-5 min).</p>
          </div>
        )}

        {/* Rapport disponible */}
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
          <User size={16} className="text-slate-600" />
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
  const [runningTask, setRunningTask] = useState(null)   // animation en cours
  const [runBlock, setRunBlock] = useState(null)         // bloc résultat + polling
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    listRecords(TBL_CLIENTS)
      .then(setAirtableClients)
      .catch(() => {})
      .finally(() => setLoadingClients(false))
  }, [])

  const selectedClient = airtableClients.find(c => c.id === selectedClientId)
  const clientName = selectedClient?.fields?.[FLD_CLIENT_NAME] || selectedClient?.fields?.['Client Name'] || ''

  // Exercice depuis le profil client ou année courante
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
        ? `Prêt à travailler sur **${clientName}** (exercice ${clientExercice}). Dites-moi ce que vous souhaitez : saisie, révision, rapport, relances — ou "rapport LECLERC".`
        : "Sélectionnez un dossier et donnez-moi une instruction.",
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

    addMsg('assistant', `Compris ! Je lance **${label}**${fournisseur ? ` sur ${fournisseur}` : ''} pour **${clientName}** (exercice ${clientExercice}).\n\nConnexion au VPS en cours...`)

    // Démarrer animation
    setRunningTask({ tache, title, fournisseur })
    setRunBlock(null)

    // Appel VPS réel
    try {
      const res = await callVPS({ client: clientName, tache: vtache, exercice: clientExercice, fournisseur })
      // Après animation (≈6s), afficher le bloc polling
      setTimeout(() => {
        setRunningTask(null)
        setRunBlock({
          runId: res.run_id || res.airtable_record_id,
          airtableRecordId: res.airtable_record_id || res.run_id,
          tache,
          clientNom: clientName,
          fournisseur,
          error: null,
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
          "Tâche non reconnue. Exemples :\n• \"Saisie\" — traitement des factures\n• \"Révision balance\" — comptes 1 à 7\n• \"Révision fournisseur\" — cycle 40x\n• \"Rapport LECLERC\" — rapport fournisseur\n• \"Relances\" — clients en retard"
        )
      }
    }, 1000)
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const suggestions = ['Révision balance', 'Rapport LECLERC', 'Saisie des factures', 'Relances clients']

  return (
    <div className="flex flex-col h-screen">
      <Header title="ComptaMind IA" subtitle="Votre collaborateur comptable IA"
        actions={
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-700 text-xs font-semibold">IA active</span>
          </div>
        }
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sélecteur dossier */}
        <div className="bg-white border-b border-slate-100 px-8 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600 flex-shrink-0">Dossier :</span>
          <div className="relative">
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 min-w-64"
            >
              <option value="">— Sélectionner un dossier —</option>
              {loadingClients && <option disabled>Chargement Airtable...</option>}
              {airtableClients.map(c => {
                const name = c.fields?.[FLD_CLIENT_NAME] || c.fields?.['Client Name'] || c.id
                return <option key={c.id} value={c.id}>{name}</option>
              })}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          {clientName && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
              Exercice {clientExercice}
            </span>
          )}
        </div>

        {/* Actions rapides */}
        <div className="bg-white border-b border-slate-100 px-8 py-3 flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex-shrink-0">Rapide :</span>
          <div className="flex gap-2 flex-wrap">
            {quickActions.map(a => (
              <button key={a.id}
                onClick={() => launchTask(a.id)}
                disabled={!selectedClientId || !!runningTask}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${a.color}`}
              >
                <span>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 bg-slate-50">
          {messages.map(msg => <Message key={msg.id} msg={msg} />)}
          {thinking && <ThinkingIndicator />}
          {runningTask && <TaskProgress task={runningTask} />}
          {runBlock && <RunBlock {...runBlock} />}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && !thinking && !runningTask && !runBlock && (
          <div className="px-8 py-3 bg-slate-50 border-t border-slate-100">
            <div className="flex gap-2 flex-wrap">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => { setInput(s); inputRef.current?.focus() }}
                  className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-full hover:border-brand-300 hover:text-brand-700 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Saisie */}
        <div className="bg-white border-t border-slate-100 px-8 py-4">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={clientName ? `Instruction pour ${clientName} (ex: "rapport LECLERC", "révision fournisseur")...` : "Sélectionnez un dossier..."}
                rows={1}
                style={{ resize: 'none', maxHeight: '120px' }}
                className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || !!runningTask}
              className="w-11 h-11 gradient-brand rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-sm"
            >
              <Send size={18} className="text-white" />
            </button>
          </div>
          <p className="text-center text-xs text-slate-400 mt-2">
            ComptaMind peut effectuer des erreurs. Vérifiez toujours les résultats importants.
          </p>
        </div>
      </div>
    </div>
  )
}
