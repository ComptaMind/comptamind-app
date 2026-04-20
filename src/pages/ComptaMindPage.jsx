import { useState, useRef, useEffect } from 'react'
import {
  Send, Bot, User, ChevronDown,
  CheckCircle, FileText, AlertTriangle, ExternalLink
} from 'lucide-react'
import Header from '../components/layout/Header'
import { listRecords } from '../lib/airtable'
import { runTask as callVPS, runDebug } from '../lib/api'
import { TBL_CLIENTS, FLD_CLIENT_NAME, TACHES } from '../lib/airtable-schema'
import { taskSteps } from '../data/mockData'

// ─── Mapping tâche locale → enum VPS ─────────────────────────────────────────

const TACHE_MAP = {
  saisie:       'saisie_factures',
  revision:     'revision_balance',
  rev_fourn:    'revision_fournisseur',
  rev_client:   'revision_client',
  rapport:      'rapport',
  rapprochement:'rapprochement_bancaire',
  relances:     'relance_clients',
}

const TASK_LABELS = {
  saisie:       'Saisie des factures',
  revision:     'Révision par la balance',
  rev_fourn:    'Révision fournisseur',
  rev_client:   'Révision client',
  rapport:      'Rapport',
  rapprochement:'Rapprochement bancaire',
  relances:     'Relances clients',
}

const quickActions = [
  { id: 'saisie',    label: 'Saisie',          icon: '📝', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
  { id: 'revision',  label: 'Révision balance', icon: '🔍', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
  { id: 'rapport',   label: 'Rapport',          icon: '📊', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
  { id: 'relances',  label: 'Relances',         icon: '📬', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
]

// ─── Détection NLP ────────────────────────────────────────────────────────────

function detectIntent(text) {
  const t = text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlève les accents pour la détection

  // Rapport + fournisseur (ex: "rapport LECLERC", "rapport sur leclerc")
  const rapportMatch = text.match(/rapport\s+(?:sur\s+|de\s+|pour\s+)?([A-Z][A-Z0-9\s\-_']+)/i)
  if (rapportMatch) {
    const fournisseur = rapportMatch[1].trim().toUpperCase()
    return { tache: 'rapport', fournisseur }
  }
  if (t.includes('rapport')) return { tache: 'rapport', fournisseur: '' }

  // Révision spécialisée (doit passer avant "revision" générique)
  if (t.includes('revision fournisseur') || t.includes('fournisseur') && t.includes('revision'))
    return { tache: 'rev_fourn', fournisseur: '' }
  if (t.includes('revision client') || t.includes('client') && t.includes('revision'))
    return { tache: 'rev_client', fournisseur: '' }

  // Tâches simples — mot entier uniquement
  if (/\bsaisie\b/.test(t)) return { tache: 'saisie', fournisseur: '' }
  if (/\brevision\b/.test(t) || /\bbalance\b/.test(t)) return { tache: 'revision', fournisseur: '' }
  if (/\brapprochement\b/.test(t)) return { tache: 'rapprochement', fournisseur: '' }
  if (/\brelance/.test(t) || /\bimpaye/.test(t)) return { tache: 'relances', fournisseur: '' }

  return null
}

// ─── Composant indicateur de réflexion ───────────────────────────────────────

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 mt-1">
        <Bot size={16} className="text-white" />
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="thinking-dot" />
          <span className="thinking-dot" />
          <span className="thinking-dot" />
          <span className="text-slate-400 text-sm ml-1">ComptaMind réfléchit...</span>
        </div>
      </div>
    </div>
  )
}

// ─── Progression animée de la tâche ──────────────────────────────────────────

function TaskProgress({ task, onComplete }) {
  const [completedSteps, setCompletedSteps] = useState([])
  const [currentStep, setCurrentStep] = useState(0)

  // Choisir les étapes en fonction de la tâche
  const stepsKey = task.tache === 'saisie' ? 'saisie'
    : task.tache === 'revision' || task.tache === 'rev_fourn' || task.tache === 'rev_client' ? 'revision'
    : task.tache === 'relances' ? 'relances'
    : 'revision'
  const steps = taskSteps[stepsKey] || taskSteps.revision

  useEffect(() => {
    let delay = 500
    steps.forEach((step, i) => {
      setTimeout(() => setCurrentStep(i), delay)
      delay += step.duration / 2
      setTimeout(() => setCompletedSteps(prev => [...prev, step.id]), delay)
      delay += step.duration / 2
    })
    setTimeout(onComplete, delay + 400)
  }, [])

  const progress = (completedSteps.length / steps.length) * 100

  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 mt-1">
        <Bot size={16} className="text-white" />
      </div>
      <div className="flex-1 bg-white border border-slate-100 rounded-2xl rounded-tl-sm p-5 shadow-sm max-w-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-bold text-slate-900">{task.title}</div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              En cours de traitement sur Pennylane...
            </div>
          </div>
          <span className="text-sm font-bold text-brand-600">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div className="h-full gradient-brand rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => {
            const done = completedSteps.includes(step.id)
            const active = currentStep === i && !done
            return (
              <div key={step.id} className={`flex items-center gap-3 text-sm transition-all ${done ? 'text-slate-600' : active ? 'text-slate-800' : 'text-slate-300'}`}>
                {done ? <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                  : active ? <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  : <div className="w-3.5 h-3.5 rounded-full border border-slate-200 flex-shrink-0" />}
                <span className={active ? 'font-medium' : ''}>{step.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Résultat du run ──────────────────────────────────────────────────────────

function RunResult({ runId, tache, clientNom, fournisseur, error }) {
  if (error) {
    return (
      <div className="flex items-start gap-3 animate-slide-up">
        <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 mt-1">
          <Bot size={16} className="text-white" />
        </div>
        <div className="flex-1 bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm p-5 shadow-sm max-w-lg">
          <div className="flex items-center gap-2 font-bold text-red-800 mb-2">
            <AlertTriangle size={16} />
            Erreur lors du lancement
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
      <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-2xl rounded-tl-sm p-5 shadow-sm max-w-lg">
        <div className="font-bold text-emerald-800 mb-2">
          ✅ {TASK_LABELS[tache] || tache} lancée — {clientNom}
          {fournisseur && ` / ${fournisseur}`}
        </div>
        {runId && (
          <p className="text-xs text-emerald-700 font-mono mb-3">
            Run ID : {runId}
          </p>
        )}
        <p className="text-sm text-emerald-700 mb-3">
          ComptaMind travaille sur Pennylane. Le rapport sera disponible dans 1 à 5 minutes dans la page <strong>Rapports</strong>.
        </p>
        <a href="/rapports" className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/80 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-white transition-colors border border-emerald-200">
          <FileText size={12} /> Voir les rapports
          <ExternalLink size={10} />
        </a>
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
        <p className="text-sm text-slate-700">{msg.text}</p>
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
  const [runningTask, setRunningTask] = useState(null)   // tâche en animation
  const [pendingRun, setPendingRun] = useState(null)     // appel VPS en attente
  const [runResult, setRunResult] = useState(null)       // résultat réel VPS
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Charger les clients depuis Airtable
  useEffect(() => {
    listRecords(TBL_CLIENTS)
      .then(setAirtableClients)
      .catch(() => {})
      .finally(() => setLoadingClients(false))
  }, [])

  const selectedClient = airtableClients.find(c => c.id === selectedClientId)
  const clientName = selectedClient?.fields?.[FLD_CLIENT_NAME] || selectedClient?.fields?.['Client Name'] || ''

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking, runningTask, runResult])

  // Message de bienvenue
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      type: 'assistant',
      text: clientName
        ? `Bonjour ! Je suis prêt à travailler sur le dossier **${clientName}**. Dites-moi ce que vous souhaitez faire : saisie, révision, rapport, relances — ou demandez un rapport spécifique, ex : "rapport LECLERC".`
        : "Bonjour ! Je suis ComptaMind, votre collaborateur comptable IA. Sélectionnez un dossier et donnez-moi une instruction.",
    }])
  }, [selectedClientId])

  const launchTask = async (tache, fournisseur = '') => {
    if (!selectedClientId || !clientName) return

    const label = TASK_LABELS[tache] || tache
    const title = `${label}${fournisseur ? ` / ${fournisseur}` : ''} — ${clientName}`

    // Message d'acquittement
    addMsg('assistant', `Compris ! Je lance : **${label}**${fournisseur ? ` pour ${fournisseur}` : ''} sur le dossier **${clientName}**. Connexion à Pennylane en cours...`)

    // Lancer l'animation ET l'appel VPS en parallèle
    setRunningTask({ tache, title, clientNom: clientName, fournisseur })
    setRunResult(null)

    // Appel VPS réel
    const vtache = TACHE_MAP[tache] || tache
    try {
      const res = await callVPS({ client: clientName, tache: vtache, exercice: '2025', fournisseur })
      setPendingRun({ runId: res.run_id || res.airtable_record_id, tache, clientNom: clientName, fournisseur, error: null })
    } catch (e) {
      setPendingRun({ runId: null, tache, clientNom: clientName, fournisseur, error: e.message })
    }
  }

  const handleTaskAnimationComplete = () => {
    setRunningTask(null)
    // Afficher le résultat VPS dès que l'animation se termine
    if (pendingRun) {
      setRunResult(pendingRun)
      setPendingRun(null)
    }
  }

  const addMsg = (type, text) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), type, text }])
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
          "Je n'ai pas reconnu de tâche comptable dans votre message. Vous pouvez me demander :\n" +
          "• \"Saisie\" — traitement des factures\n" +
          "• \"Révision balance\" — analyse des comptes 1 à 7\n" +
          "• \"Rapport LECLERC\" — rapport sur un fournisseur\n" +
          "• \"Relances\" — relances clients en retard"
        )
      }
    }, 1000)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const suggestions = [
    'Révision balance',
    'Rapport LECLERC',
    'Saisie des factures',
    'Relances clients',
  ]

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
        {/* Sélecteur de dossier */}
        <div className="bg-white border-b border-slate-100 px-8 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600 flex-shrink-0">Dossier actif :</span>
          <div className="relative">
            <select
              value={selectedClientId}
              onChange={e => { setSelectedClientId(e.target.value); setRunningTask(null); setRunResult(null) }}
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
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{clientName}</span>
          )}
        </div>

        {/* Actions rapides */}
        <div className="bg-white border-b border-slate-100 px-8 py-3 flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex-shrink-0">Rapide :</span>
          <div className="flex gap-2 flex-wrap">
            {quickActions.map(a => (
              <button
                key={a.id}
                onClick={() => launchTask(a.id)}
                disabled={!selectedClientId || !!runningTask}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${a.color}`}
              >
                <span>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Zone messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 bg-slate-50">
          {messages.map(msg => <Message key={msg.id} msg={msg} />)}
          {thinking && <ThinkingIndicator />}
          {runningTask && <TaskProgress task={runningTask} onComplete={handleTaskAnimationComplete} />}
          {runResult && <RunResult {...runResult} />}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && !thinking && !runningTask && (
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

        {/* Zone saisie */}
        <div className="bg-white border-t border-slate-100 px-8 py-4">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={clientName ? `Instruction pour ${clientName}... (ex: "rapport LECLERC", "saisie", "révision")` : "Sélectionnez un dossier puis donnez une instruction..."}
                rows={1}
                style={{ resize: 'none', maxHeight: '120px' }}
                className="w-full px-4 py-3 pr-12 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
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
