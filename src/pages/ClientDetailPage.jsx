import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Bot, Brain, FileText, Activity, ArrowLeft, ExternalLink,
  CheckCircle, AlertTriangle, Clock, Calendar, Mail, Phone,
  Play, ChevronRight, Edit, Trash2, Plus
} from 'lucide-react'
import Header from '../components/layout/Header'
import { useAppStore } from '../store/useAppStore'

const statusConfig = {
  a_jour: { label: 'À jour', color: 'bg-emerald-100 text-emerald-700', barColor: 'bg-emerald-500' },
  en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-700', barColor: 'bg-brand-500' },
  en_retard: { label: 'En retard', color: 'bg-red-100 text-red-700', barColor: 'bg-red-400' },
  nouveau: { label: 'Nouveau', color: 'bg-slate-100 text-slate-600', barColor: 'bg-slate-300' },
}

const TABS = [
  { id: 'apercu', label: 'Aperçu', icon: Activity },
  { id: 'comptamind', label: 'ComptaMind', icon: Bot },
  { id: 'memoire', label: 'Mémoire', icon: Brain },
  { id: 'rapports', label: 'Rapports', icon: FileText },
]

export default function ClientDetailPage() {
  const { id } = useParams()
  const [tab, setTab] = useState('apercu')
  const [showAddMemory, setShowAddMemory] = useState(false)
  const [newMemory, setNewMemory] = useState({ titre: '', contenu: '', categorie: 'note' })

  const { clients, activities, memories, addMemory, deleteMemory } = useAppStore()
  const navigate = useNavigate()

  const client = clients.find(c => c.id === id)
  const clientActivities = activities.filter(a => a.clientId === id)
  const clientMemories = memories[id] || []

  if (!client) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Client introuvable.</p>
        <button onClick={() => navigate('/clients')} className="btn-primary mt-4">Retour aux clients</button>
      </div>
    )
  }

  const statusConf = statusConfig[client.status] || statusConfig.nouveau
  const activityTypeEmoji = { saisie: '📝', revision: '🔍', cloture: '✅', relances: '📬' }

  const handleAddMemory = () => {
    if (newMemory.titre && newMemory.contenu) {
      addMemory(id, newMemory)
      setNewMemory({ titre: '', contenu: '', categorie: 'note' })
      setShowAddMemory(false)
    }
  }

  return (
    <div>
      <Header
        title={client.nom}
        subtitle={client.secteur}
        breadcrumbs={['Clients', client.nom]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/clients')} className="btn-ghost">
              <ArrowLeft size={16} /> Retour
            </button>
            <button onClick={() => navigate(`/comptamind?client=${id}`)} className="btn-primary">
              <Bot size={16} /> Lancer ComptaMind
            </button>
          </div>
        }
      />

      <div className="p-8">
        {/* Client header card */}
        <div className="card p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <span className="text-slate-600 font-bold text-xl">
                  {client.nom.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h2 className="text-xl font-bold text-slate-900">{client.nom}</h2>
                  <span className={`badge ${statusConf.color}`}>{statusConf.label}</span>
                  {client.alertes > 0 && (
                    <span className="badge bg-amber-100 text-amber-700">
                      <AlertTriangle size={10} /> {client.alertes} alerte{client.alertes > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                  <span>{client.responsable}</span>
                  {client.email && (
                    <a href={`mailto:${client.email}`} className="flex items-center gap-1 hover:text-brand-600">
                      <Mail size={13} /> {client.email}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {client.tags?.map(tag => (
                    <span key={tag} className="badge bg-slate-100 text-slate-600">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {client.pennylane && (
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-black">P</span>
                  </div>
                  <span className="text-indigo-700 text-xs font-semibold">Pennylane connecté</span>
                </div>
              )}
            </div>
          </div>

          {/* Avancement */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Avancement — Exercice {client.exercice}</span>
              <span className="text-sm font-bold text-slate-900">{client.avancement}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${statusConf.barColor}`}
                style={{ width: `${client.avancement}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{client.derniereOperation}</p>
          </div>
        </div>

        {/* Stats mini */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Opérations', value: clientActivities.length, icon: '⚡', sub: 'Total effectuées' },
            { label: 'Alertes', value: client.alertes, icon: '⚠️', sub: 'En attente' },
            { label: 'Mémoires', value: clientMemories.length, icon: '🧠', sub: 'Informations enregistrées' },
            { label: 'Exercice', value: client.exercice, icon: '📅', sub: client.avancement === 100 ? 'Terminé' : 'En cours' },
          ].map((stat, i) => (
            <div key={i} className="card p-4">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === tabId ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'apercu' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 card p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4">Historique d'activité ComptaMind</h3>
              {clientActivities.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="text-4xl mb-3">🤖</div>
                  <p className="text-slate-500 font-medium">Aucune activité pour ce client</p>
                  <p className="text-slate-400 text-sm mt-1">Lancez ComptaMind pour commencer</p>
                  <button onClick={() => navigate(`/comptamind?client=${id}`)} className="btn-primary mt-4">
                    <Bot size={16} /> Lancer ComptaMind
                  </button>
                </div>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-100" />
                  {clientActivities.map((activity, i) => {
                    const emoji = activityTypeEmoji[activity.type] || '📋'
                    const date = new Date(activity.createdAt)
                    return (
                      <div key={activity.id} className="relative mb-5 last:mb-0">
                        <div className="absolute -left-3.5 mt-0.5 w-3 h-3 rounded-full bg-white border-2 border-slate-200" />
                        <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span>{emoji}</span>
                              <span className="text-sm font-semibold text-slate-800">{activity.description}</span>
                            </div>
                            {activity.status === 'success' && <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />}
                            {activity.status === 'warning' && <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />}
                          </div>
                          <div className="text-xs text-slate-400">
                            {date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Informations</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Responsable', value: client.responsable },
                    { label: 'Régime', value: 'IS' },
                    { label: 'TVA', value: 'Mensuelle' },
                    { label: 'Exercice', value: client.exercice },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-start">
                      <span className="text-xs text-slate-400">{item.label}</span>
                      <span className="text-xs font-medium text-slate-700 text-right">{item.value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Actions rapides</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Lancer la saisie', icon: '📝' },
                    { label: 'Révision balance', icon: '🔍' },
                    { label: 'Envoyer relances', icon: '📬' },
                  ].map((action, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/comptamind?client=${id}`)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                    >
                      <span>{action.icon}</span>
                      <span className="text-sm font-medium text-slate-700">{action.label}</span>
                      <ChevronRight size={14} className="ml-auto text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'memoire' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Mémoire ComptaMind</h3>
                <p className="text-sm text-slate-500 mt-0.5">Informations et instructions spécifiques à ce dossier</p>
              </div>
              <button onClick={() => setShowAddMemory(true)} className="btn-primary text-sm">
                <Plus size={15} /> Ajouter
              </button>
            </div>

            {showAddMemory && (
              <div className="card p-5 mb-5 border-brand-200 bg-brand-50/30">
                <h4 className="text-sm font-bold text-slate-900 mb-3">Nouvelle entrée de mémoire</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <input className="input text-sm" placeholder="Titre de la mémoire"
                        value={newMemory.titre} onChange={e => setNewMemory({...newMemory, titre: e.target.value})} />
                    </div>
                    <select className="input text-sm" value={newMemory.categorie} onChange={e => setNewMemory({...newMemory, categorie: e.target.value})}>
                      <option value="note">📝 Note</option>
                      <option value="instruction">⚡ Instruction</option>
                      <option value="preference">⭐ Préférence</option>
                    </select>
                  </div>
                  <textarea className="input text-sm resize-none" rows={3} placeholder="Contenu de la mémoire..."
                    value={newMemory.contenu} onChange={e => setNewMemory({...newMemory, contenu: e.target.value})} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowAddMemory(false)} className="btn-secondary text-sm py-2">Annuler</button>
                    <button onClick={handleAddMemory} className="btn-primary text-sm py-2">Enregistrer</button>
                  </div>
                </div>
              </div>
            )}

            {clientMemories.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="text-4xl mb-3">🧠</div>
                <p className="text-slate-600 font-medium">Aucune mémoire enregistrée</p>
                <p className="text-slate-400 text-sm mt-1">Ajoutez des instructions et informations pour personnaliser ComptaMind</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {clientMemories.map(mem => {
                  const catEmoji = { note: '📝', instruction: '⚡', preference: '⭐' }[mem.categorie] || '📝'
                  const catColors = {
                    note: 'bg-blue-50 border-blue-100',
                    instruction: 'bg-amber-50 border-amber-100',
                    preference: 'bg-violet-50 border-violet-100'
                  }[mem.categorie] || 'bg-slate-50 border-slate-100'
                  return (
                    <div key={mem.id} className={`p-4 rounded-xl border ${catColors} group`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{catEmoji}</span>
                          <span className="text-sm font-semibold text-slate-900">{mem.titre}</span>
                        </div>
                        <button
                          onClick={() => deleteMemory(id, mem.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <p className="text-sm text-slate-600">{mem.contenu}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(mem.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'comptamind' && (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
              <Bot size={28} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Lancer ComptaMind pour {client.nom}</h3>
            <p className="text-slate-500 text-sm mb-6">Accédez à l'interface de commande ComptaMind pour ce dossier</p>
            <button onClick={() => navigate(`/comptamind?client=${id}`)} className="btn-primary mx-auto">
              <Bot size={16} /> Ouvrir ComptaMind
            </button>
          </div>
        )}

        {tab === 'rapports' && (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-slate-600 font-medium">Rapports disponibles prochainement</p>
            <p className="text-slate-400 text-sm mt-1">Les rapports générés par ComptaMind apparaîtront ici</p>
          </div>
        )}
      </div>
    </div>
  )
}
