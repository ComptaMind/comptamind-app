import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Send, Bot, User, ChevronDown, Zap, CheckCircle,
  AlertTriangle, Clock, FileText, Brain, Sparkles,
  Play, X, ChevronRight, Download
} from 'lucide-react'
import Header from '../components/layout/Header'
import { useAppStore } from '../store/useAppStore'
import { taskSteps } from '../data/mockData'

const quickActions = [
  { id: 'saisie', label: 'Saisie mensuelle', icon: '📝', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100', taskType: 'saisie' },
  { id: 'revision', label: 'Révision balance', icon: '🔍', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100', taskType: 'revision' },
  { id: 'cloture', label: 'Clôture', icon: '✅', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100', taskType: 'cloture' },
  { id: 'relances', label: 'Relances clients', icon: '📬', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100', taskType: 'relances' },
]

const taskResultTemplates = {
  saisie: (clientNom) => ({
    titre: `✅ Saisie terminée — ${clientNom}`,
    stats: [
      { label: 'Écritures saisies', value: Math.floor(Math.random() * 30) + 25, icon: '📝' },
      { label: 'Factures fournisseurs', value: Math.floor(Math.random() * 10) + 8, icon: '🧾' },
      { label: 'Opérations bancaires', value: Math.floor(Math.random() * 10) + 5, icon: '🏦' },
      { label: 'Éléments à vérifier', value: Math.floor(Math.random() * 3), icon: '⚠️' },
    ],
    message: "La saisie a été effectuée avec succès sur Pennylane. Les écritures comptables ont été vérifiées et les comptes sont équilibrés.",
    color: 'emerald',
  }),
  revision: (clientNom) => ({
    titre: `🔍 Révision terminée — ${clientNom}`,
    stats: [
      { label: 'Comptes analysés', value: Math.floor(Math.random() * 50) + 80, icon: '📊' },
      { label: 'Anomalies détectées', value: Math.floor(Math.random() * 2), icon: '⚠️' },
      { label: 'Soldes vérifiés', value: Math.floor(Math.random() * 30) + 40, icon: '✅' },
      { label: 'Score de conformité', value: `${Math.floor(Math.random() * 15) + 85}%`, icon: '⭐' },
    ],
    message: "La révision par la balance est complète. Aucune anomalie majeure détectée. Les cycles clients, fournisseurs et TVA sont conformes.",
    color: 'purple',
  }),
  cloture: (clientNom) => ({
    titre: `✅ Clôture effectuée — ${clientNom}`,
    stats: [
      { label: 'Écritures d\'inventaire', value: Math.floor(Math.random() * 15) + 10, icon: '📋' },
      { label: 'Amortissements', value: Math.floor(Math.random() * 8) + 5, icon: '🏭' },
      { label: 'Provisions calculées', value: Math.floor(Math.random() * 4) + 2, icon: '💰' },
      { label: 'Liasse exportée', value: 'Oui', icon: '📤' },
    ],
    message: "La clôture a été réalisée avec succès. Les écritures de fin d'exercice ont été passées et la liasse fiscale est prête pour télétransmission.",
    color: 'emerald',
  }),
  relances: (clientNom) => ({
    titre: `📬 Relances envoyées — ${clientNom}`,
    stats: [
      { label: 'Relances envoyées', value: Math.floor(Math.random() * 5) + 2, icon: '📬' },
      { label: 'Montant total', value: `${(Math.random() * 8000 + 2000).toFixed(0)} €`, icon: '💶' },
      { label: 'Créances > 60j', value: Math.floor(Math.random() * 3) + 1, icon: '🔴' },
      { label: 'En attente réponse', value: Math.floor(Math.random() * 3) + 1, icon: '⏳' },
    ],
    message: "Les relances ont été envoyées aux clients en retard de paiement. Un suivi sera effectué dans 7 jours si aucune réponse n'est reçue.",
    color: 'amber',
  }),
}

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

function TaskProgress({ task, onComplete }) {
  const [completedSteps, setCompletedSteps] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const steps = taskSteps[task.type] || taskSteps.saisie

  useEffect(() => {
    let totalDelay = 500
    steps.forEach((step, i) => {
      setTimeout(() => {
        setCurrentStep(i)
      }, totalDelay)
      totalDelay += step.duration / 2
      setTimeout(() => {
        setCompletedSteps(prev => [...prev, step.id])
      }, totalDelay)
      totalDelay += step.duration / 2
    })
    setTimeout(() => {
      onComplete()
    }, totalDelay + 400)
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

        {/* Progress bar */}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full gradient-brand rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {steps.map((step, i) => {
            const isCompleted = completedSteps.includes(step.id)
            const isActive = currentStep === i && !isCompleted
            return (
              <div key={step.id} className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                isCompleted ? 'text-slate-600' : isActive ? 'text-slate-800' : 'text-slate-300'
              }`}>
                {isCompleted ? (
                  <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                ) : isActive ? (
                  <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-200 flex-shrink-0" />
                )}
                <span className={isActive ? 'font-medium' : ''}>{step.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TaskReport({ result, clientNom }) {
  const colorMap = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', title: 'text-emerald-800', stat: 'bg-emerald-100 text-emerald-700' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-100', title: 'text-purple-800', stat: 'bg-purple-100 text-purple-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', title: 'text-amber-800', stat: 'bg-amber-100 text-amber-700' },
  }
  const colors = colorMap[result.color] || colorMap.emerald

  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 mt-1">
        <Bot size={16} className="text-white" />
      </div>
      <div className={`flex-1 rounded-2xl rounded-tl-sm border p-5 shadow-sm max-w-lg ${colors.bg} ${colors.border}`}>
        <div className="font-bold text-slate-900 mb-3">{result.titre}</div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {result.stats.map((stat, i) => (
            <div key={i} className="bg-white/70 rounded-xl p-3">
              <div className="text-lg mb-0.5">{stat.icon}</div>
              <div className="text-xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        <p className="text-sm text-slate-600 mb-4">{result.message}</p>

        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 bg-white/80 text-slate-700 text-xs font-semibold rounded-lg hover:bg-white transition-colors border border-white/50">
            <FileText size={12} /> Voir le rapport complet
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-white/80 text-slate-700 text-xs font-semibold rounded-lg hover:bg-white transition-colors border border-white/50">
            <Download size={12} /> Exporter PDF
          </button>
        </div>
      </div>
    </div>
  )
}

function Message({ msg, clients }) {
  const client = msg.clientId ? clients.find(c => c.id === msg.clientId) : null

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

  if (msg.type === 'assistant') {
    return (
      <div className="flex items-start gap-3 animate-slide-up">
        <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 mt-1">
          <Bot size={16} className="text-white" />
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-lg">
          <p className="text-sm text-slate-700">{msg.text}</p>
          {client && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <span>Dossier :</span>
              <span className="font-medium text-brand-600">{client.nom}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}

export default function ComptaMindPage() {
  const [searchParams] = useSearchParams()
  const clientIdFromUrl = searchParams.get('client')
  const [selectedClientId, setSelectedClientId] = useState(clientIdFromUrl || '')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [thinking, setThinking] = useState(false)
  const [runningTask, setRunningTask] = useState(null)
  const [taskResult, setTaskResult] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const { clients } = useAppStore()
  const navigate = useNavigate()

  const selectedClient = clients.find(c => c.id === selectedClientId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking, runningTask, taskResult])

  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg = {
        id: 'welcome',
        type: 'assistant',
        text: selectedClient
          ? `Bonjour ! Je suis ComptaMind, prêt à travailler sur le dossier **${selectedClient.nom}**. Que souhaitez-vous faire ? Vous pouvez utiliser les boutons rapides ci-dessous ou me donner une instruction directement.`
          : "Bonjour ! Je suis ComptaMind, votre collaborateur comptable IA. Sélectionnez un client et dites-moi ce que vous souhaitez faire — saisie, révision, clôture, relances, ou toute autre tâche comptable.",
        timestamp: new Date(),
      }
      setMessages([welcomeMsg])
    }
  }, [selectedClientId])

  const runTask = (taskType, clientId) => {
    const client = clients.find(c => c.id === clientId)
    if (!client) return

    const taskLabels = { saisie: 'Saisie mensuelle', revision: 'Révision par la balance', cloture: 'Clôture de l\'exercice', relances: 'Relances clients' }
    const taskLabel = taskLabels[taskType] || taskType

    // Add user message
    const userMsg = { id: Date.now() + 'u', type: 'user', text: `Lance la ${taskLabel.toLowerCase()} pour ${client.nom}`, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])

    // Show thinking
    setThinking(true)
    setTimeout(() => {
      setThinking(false)

      // Add assistant acknowledgment
      const ackMsg = {
        id: Date.now() + 'a',
        type: 'assistant',
        text: `Compris ! Je lance la ${taskLabel.toLowerCase()} pour **${client.nom}**. Je me connecte à Pennylane et commence le traitement...`,
        clientId: client.id,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, ackMsg])

      // Start task progress
      setRunningTask({
        id: Date.now().toString(),
        type: taskType,
        title: `${taskLabel} — ${client.nom}`,
        clientId: client.id,
        clientNom: client.nom,
      })
      setTaskResult(null)
    }, 1500)
  }

  const handleTaskComplete = () => {
    if (!runningTask) return
    const resultTemplate = taskResultTemplates[runningTask.type]
    const result = resultTemplate ? resultTemplate(runningTask.clientNom) : null
    setTaskResult(result)
    setRunningTask(null)

    // Add completion message
    setTimeout(() => {
      const doneMsg = {
        id: Date.now() + 'd',
        type: 'assistant',
        text: `La tâche est terminée ! Voici le compte-rendu ci-dessus. Puis-je faire autre chose pour vous ?`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, doneMsg])
    }, 500)
  }

  const handleSend = () => {
    if (!input.trim()) return
    const text = input.trim()
    setInput('')

    const userMsg = { id: Date.now() + 'u', type: 'user', text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])

    setThinking(true)

    // Detect task keywords
    const lowerText = text.toLowerCase()
    let detectedTask = null
    if (lowerText.includes('saisie') || lowerText.includes('saisi')) detectedTask = 'saisie'
    else if (lowerText.includes('révision') || lowerText.includes('revision') || lowerText.includes('balance')) detectedTask = 'revision'
    else if (lowerText.includes('clôture') || lowerText.includes('cloture') || lowerText.includes('fermer')) detectedTask = 'cloture'
    else if (lowerText.includes('relance') || lowerText.includes('impayé')) detectedTask = 'relances'

    setTimeout(() => {
      setThinking(false)

      if (detectedTask && selectedClientId) {
        const client = clients.find(c => c.id === selectedClientId)
        const taskLabels = { saisie: 'saisie mensuelle', revision: 'révision par la balance', cloture: 'clôture', relances: 'relances clients' }
        const ackMsg = {
          id: Date.now() + 'a',
          type: 'assistant',
          text: `Bien compris ! Je lance la ${taskLabels[detectedTask]} pour **${client?.nom || 'le dossier sélectionné'}**. Connexion à Pennylane en cours...`,
          clientId: selectedClientId,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, ackMsg])
        setRunningTask({
          id: Date.now().toString(),
          type: detectedTask,
          title: `${taskLabels[detectedTask].charAt(0).toUpperCase() + taskLabels[detectedTask].slice(1)} — ${client?.nom}`,
          clientId: selectedClientId,
          clientNom: client?.nom || '',
        })
      } else if (detectedTask && !selectedClientId) {
        const ackMsg = {
          id: Date.now() + 'a',
          type: 'assistant',
          text: `Je vois que vous souhaitez lancer une ${detectedTask}. Veuillez d'abord sélectionner un client dans le menu déroulant ci-dessus.`,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, ackMsg])
      } else {
        const responses = [
          "Je comprends votre demande. Pour lancer une action comptable, utilisez les boutons rapides ou dites-moi : « Lance la saisie de mars pour [nom du client] ».",
          "Bien noté ! Je suis prêt à traiter vos tâches comptables. Sélectionnez un client et choisissez une action pour commencer.",
          "Parfait ! N'hésitez pas à me donner des instructions spécifiques comme : « Révise la balance de Bellevoie SARL » ou « Envoie les relances pour tous les clients ».",
        ]
        const ackMsg = {
          id: Date.now() + 'a',
          type: 'assistant',
          text: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, ackMsg])
      }
    }, 1500)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestions = [
    'Lance la saisie du mois de mars',
    'Révise la balance et signale les anomalies',
    'Envoie les relances aux clients en retard',
    'Prépare la clôture de l\'exercice',
  ]

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="ComptaMind"
        subtitle="Votre collaborateur comptable IA"
        breadcrumbs={['ComptaMind']}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-700 text-xs font-semibold">IA active</span>
            </div>
          </div>
        }
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Client selector bar */}
        <div className="bg-white border-b border-slate-100 px-8 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600 flex-shrink-0">Dossier actif :</span>
          <div className="relative">
            <select
              value={selectedClientId}
              onChange={e => {
                setSelectedClientId(e.target.value)
                setMessages([])
                setRunningTask(null)
                setTaskResult(null)
              }}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 min-w-64"
            >
              <option value="">— Sélectionner un client —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          {selectedClient && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>·</span>
              <span>{selectedClient.secteur}</span>
              <span>·</span>
              <span className={`badge ${selectedClient.avancement === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                {selectedClient.avancement}% complété
              </span>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white border-b border-slate-100 px-8 py-3 flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex-shrink-0">Actions rapides :</span>
          <div className="flex gap-2 flex-wrap">
            {quickActions.map(action => (
              <button
                key={action.id}
                onClick={() => selectedClientId ? runTask(action.taskType, selectedClientId) : null}
                disabled={!selectedClientId || !!runningTask}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${action.color}`}
              >
                <span>{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 bg-slate-50">
          {messages.map(msg => (
            <Message key={msg.id} msg={msg} clients={clients} />
          ))}
          {thinking && <ThinkingIndicator />}
          {runningTask && (
            <TaskProgress task={runningTask} onComplete={handleTaskComplete} />
          )}
          {taskResult && <TaskReport result={taskResult} clientNom={selectedClient?.nom || ''} />}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions (when no messages beyond welcome) */}
        {messages.length <= 1 && !thinking && !runningTask && (
          <div className="px-8 py-3 bg-slate-50 border-t border-slate-100">
            <div className="flex gap-2 flex-wrap">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); inputRef.current?.focus() }}
                  className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-full hover:border-brand-300 hover:text-brand-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="bg-white border-t border-slate-100 px-8 py-4">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selectedClientId ? `Donnez une instruction à ComptaMind pour ${selectedClient?.nom}...` : "Sélectionnez un client puis donnez une instruction à ComptaMind..."}
                rows={1}
                style={{ resize: 'none', maxHeight: '120px' }}
                className="w-full px-4 py-3 pr-12 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                onInput={e => {
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
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
