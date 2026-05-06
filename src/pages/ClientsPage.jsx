import { useState, useEffect } from 'react'
import { Search, Bot, AlertTriangle, CheckCircle, Clock, Building2, Play, Bug, Plus, X, Eye, EyeOff } from 'lucide-react'
import Header from '../components/layout/Header'
import { listRecords } from '../lib/airtable'
import { runTask, runDebug } from '../lib/api'
import { TBL_CLIENTS, FLD_CLIENT_NAME, FLD_CLIENT_STATUS, FLD_CLIENT_SIREN, FLD_CLIENT_PROFIL, TACHES } from '../lib/airtable-schema'
import { EXCLUDED_CLIENT_IDS } from '../hooks/useAirtableClients'
import { useT } from '../hooks/useT'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getExercice(record) {
  const fields = record.fields || {}
  // Tenter "Exercice en cours" (nom Airtable) puis profil JSON
  if (fields['Exercice en cours']) return String(fields['Exercice en cours'])
  if (fields[FLD_CLIENT_PROFIL]) {
    const profil = fields[FLD_CLIENT_PROFIL]
    const match = String(profil).match(/20\d\d/)
    if (match) return match[0]
  }
  return '2026' // défaut : exercice actif
}

function isObservationMode(exercice) {
  return parseInt(exercice, 10) <= 2025
}

function getTypeEntite(record) {
  const fields = record.fields || {}
  return fields['Type entité'] || fields[FLD_CLIENT_PROFIL] || ''
}

// ─── Modal Lancer ComptaMind ──────────────────────────────────────────────────

function RunModal({ client, onClose }) {
  const t = useT()
  const exercice = getExercice(client)
  const obsMode = isObservationMode(exercice)

  const [tache, setTache] = useState(obsMode ? 'revision_balance' : 'revision_balance')
  const [exerciceInput, setExerciceInput] = useState(exercice)
  const [fournisseur, setFournisseur] = useState('')
  const [loading, setLoading] = useState(false)
  const [debugResult, setDebugResult] = useState(null)
  const [runResult, setRunResult] = useState(null)
  const [error, setError] = useState('')

  const clientName = client.fields[FLD_CLIENT_NAME] || client.fields['Client Name'] || 'Client'
  const needsFournisseur = tache === 'revision_fournisseur'
  const tacheInfo = TACHES.find(t => t.value === tache)
  const isDisabled = obsMode && tacheInfo?.writeOp

  const handleDebug = async () => {
    setLoading(true); setError(''); setDebugResult(null)
    try {
      const res = await runDebug({ client: clientName, tache, exercice: exerciceInput, fournisseur })
      setDebugResult(res)
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  const handleRun = async () => {
    setLoading(true); setError(''); setRunResult(null)
    try {
      const res = await runTask({ client: clientName, tache, exercice: exerciceInput, fournisseur })
      setRunResult(res)
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #6366f1, #06b6d4)'}}>
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('Launch ComptaMind', 'Lancer ComptaMind')}</h2>
              <p className="text-sm text-slate-500">{clientName}</p>
            </div>
          </div>
          {obsMode && (
            <div className="mt-3 flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
              <AlertTriangle size={15} />
              {t(`Closed fiscal year (${exercice}) — observation mode. Write operations are disabled.`, `Exercice clôturé (${exercice}) — mode observation. Les opérations d'écriture sont désactivées.`)}
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label">{t('Task', 'Tâche')}</label>
            <select className="input" value={tache} onChange={e => setTache(e.target.value)}>
              {TACHES.map(task => (
                <option key={task.value} value={task.value} disabled={obsMode && task.writeOp}>
                  {task.label}{obsMode && task.writeOp ? t(' (closed fiscal year)', ' (exercice clôturé)') : ''}
                </option>
              ))}
            </select>
            {isDisabled && (
              <p className="text-xs text-red-500 mt-1">{t('This task requires an open fiscal year (≥ 2026)', 'Cette tâche nécessite un exercice ouvert (≥ 2026)')}</p>
            )}
          </div>

          <div>
            <label className="label">{t('Fiscal year', "Exercice fiscal")}</label>
            <input className="input" value={exerciceInput} onChange={e => setExerciceInput(e.target.value)} placeholder="2025" />
          </div>

          {needsFournisseur && (
            <div>
              <label className="label">{t('Supplier (optional)', 'Fournisseur (optionnel)')}</label>
              <input className="input" value={fournisseur} onChange={e => setFournisseur(e.target.value)} placeholder="e.g. LECLERC" />
            </div>
          )}

          {/* Résultats */}
          {debugResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-700 max-h-32 overflow-auto">
              <p className="font-semibold text-slate-900 mb-1 font-sans">{t('Diagnostic result:', 'Résultat du diagnostic :')}</p>
              <pre>{JSON.stringify(debugResult, null, 2)}</pre>
            </div>
          )}
          {runResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
              <p className="font-semibold mb-1">{t('Run launched ✓', 'Exécution lancée ✓')}</p>
              <p>ID: <span className="font-mono">{runResult.run_id || runResult.airtable_record_id || t('in progress', 'en cours')}</span></p>
              <p className="text-xs text-emerald-600 mt-1">{t('Check "Reports" in 1 to 5 minutes for the result.', 'Consultez "Rapports" dans 1 à 5 minutes pour le résultat.')}</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">{t('Cancel', 'Annuler')}</button>
          <button
            onClick={handleDebug}
            disabled={loading || isDisabled}
            className="btn-ghost flex-1 flex items-center justify-center gap-2"
          >
            <Bug size={15} />
            {t('Diagnose', 'Diagnostiquer')}
          </button>
          <button
            onClick={handleRun}
            disabled={loading || isDisabled || !!runResult}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Play size={15} />
                {t('Run', 'Exécuter')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card client ──────────────────────────────────────────────────────────────

function ClientCard({ record, onLaunch }) {
  const t = useT()
  const fields = record.fields || {}
  const name = fields[FLD_CLIENT_NAME] || fields['Client Name'] || record.id
  const siren = fields[FLD_CLIENT_SIREN] || fields['SIREN'] || ''
  const profil = fields[FLD_CLIENT_PROFIL] || fields['Profil comptable'] || ''
  const status = fields[FLD_CLIENT_STATUS] || fields['Dossier Status'] || ''
  const exercice = getExercice(record)
  const obsMode = isObservationMode(exercice)
  const lastAction = fields['Last ComptaMind Action'] || ''

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <Building2 size={18} className="text-brand-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{name}</h3>
          </div>
        </div>
        {obsMode ? (
          <span className="badge text-amber-700 bg-amber-50 border border-amber-200 text-xs">{t('Closed year', 'Année clôturée')}</span>
        ) : (
          <span className="badge text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs">{t('Active', 'Actif')}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {profil && <span className="badge">{profil}</span>}
        <span className="badge">{t('Year', 'Exercice')} {exercice}</span>
        {status && <span className="badge">{status}</span>}
      </div>

      {lastAction && (
        <p className="text-xs text-slate-400 mb-3 truncate">{t('Last action:', 'Dernière action :')} {lastAction}</p>
      )}

      <button
        onClick={() => onLaunch(record)}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2"
      >
        <Bot size={15} />
        {obsMode ? t('Launch report', 'Lancer rapport') : t('Launch ComptaMind', 'Lancer ComptaMind')}
      </button>
    </div>
  )
}

// ─── Modal Nouveau Dossier ────────────────────────────────────────────────────

function NewDossierModal({ onClose, onCreated }) {
  const t = useT()
  const [nom, setNom] = useState('')
  const [token, setToken] = useState('')
  const [exercice, setExercice] = useState('2026')
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nom.trim() || !token.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await runTask({ client: nom.trim(), tache: 'onboarding', exercice, fournisseur: '' })
      setResult(res)
      if (onCreated) setTimeout(onCreated, 3000)
    } catch (e) {
      // Si onboarding non encore déployé côté VPS, afficher message explicatif
      if (e.message.includes('422') || e.message.includes('not found') || e.message.includes('tache')) {
        setError('La tâche "onboarding" est en cours de déploiement côté serveur. Contactez AC pour créer le dossier manuellement dans Airtable.')
      } else {
        setError(e.message)
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('New client', 'Nouveau client')}</h2>
            <p className="text-sm text-slate-500">{t('ComptaMind will automatically create and enrich the client file', 'ComptaMind va créer et enrichir automatiquement le dossier client')}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">{t('Client name (as in Pennylane)', 'Nom du client (tel que dans Pennylane)')}</label>
            <input className="input" value={nom} onChange={e => setNom(e.target.value)} placeholder="e.g. ATALAO" required />
          </div>
          <div>
            <label className="label">{t('Client Pennylane token', 'Token Pennylane du client')}</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="pat_xxxxxxxx..."
                required
              />
              <button type="button" onClick={() => setShowToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">{t('Current fiscal year', "Exercice en cours")}</label>
            <input className="input" value={exercice} onChange={e => setExercice(e.target.value)} placeholder="2026" />
          </div>

          {result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
              <p className="font-semibold mb-1">{t('Onboarding launched ✓', 'Onboarding lancé ✓')}</p>
              <p className="text-xs">{t('ComptaMind will fetch Pennylane + Pappers info and create the client in Airtable. Refresh the list in 1-2 minutes.', 'ComptaMind va récupérer les infos Pennylane + Pappers et créer le client dans Airtable. Actualisez dans 1-2 minutes.')}</p>
            </div>
          )}
          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('Cancel', 'Annuler')}</button>
            <button type="submit" disabled={loading || !!result} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={15} />}
              {t('Create client', 'Créer le client')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ClientsPage() {
  const t = useT()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewDossier, setShowNewDossier] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const records = await listRecords(TBL_CLIENTS)
        setClients(records.filter(r => !EXCLUDED_CLIENT_IDS.has(r.id)))
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = clients.filter(r => {
    const name = (r.fields[FLD_CLIENT_NAME] || r.fields['Client Name'] || '').toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const actifs  = filtered.filter(r => !isObservationMode(getExercice(r)))
  const audits  = filtered.filter(r =>  isObservationMode(getExercice(r)))

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title={t('My Clients', 'Mes Clients')}
        subtitle={loading ? t('Loading…', 'Chargement…') : `${clients.length} client${clients.length > 1 ? 's' : ''} ${t('in Airtable', 'dans Airtable')}`}
        actions={
          <button onClick={() => setShowNewDossier(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} />
            {t('New client', 'Nouveau client')}
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Barre de recherche */}
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder={t('Search a client…', 'Rechercher un client…')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <p className="font-semibold mb-1">{t('Unable to load clients', 'Impossible de charger les clients')}</p>
            <p>{error}</p>
            <p className="text-xs mt-2 text-red-500">{t('Make sure VITE_AIRTABLE_TOKEN is configured in Netlify.', 'Assurez-vous que VITE_AIRTABLE_TOKEN est configuré dans Netlify.')}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 text-slate-500">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            {t('Connecting to Airtable…', 'Connexion à Airtable…')}
          </div>
        )}

        {/* Dossiers actifs */}
        {!loading && actifs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={16} className="text-emerald-500" />
              <h2 className="font-bold text-slate-900">{t('Active clients', 'Clients actifs')}</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{actifs.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {actifs.map(r => (
                <ClientCard key={r.id} record={r} onLaunch={setSelectedClient} />
              ))}
            </div>
          </div>
        )}

        {/* Dossiers en audit */}
        {!loading && audits.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-amber-500" />
              <h2 className="font-bold text-slate-900">{t('Clients under review / audit', 'Clients en révision / audit')}</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{audits.length}</span>
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {t('Closed fiscal year — read-only', 'Exercice clôturé — lecture seule')}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {audits.map(r => (
                <ClientCard key={r.id} record={r} onLaunch={setSelectedClient} />
              ))}
            </div>
          </div>
        )}

        {/* Aucun client */}
        {!loading && !error && clients.length === 0 && (
          <div className="text-center py-16">
            <Building2 size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">{t('No clients found in Airtable', 'Aucun client trouvé dans Airtable')}</p>
            <p className="text-slate-400 text-sm mt-1">{t('Check your Airtable token configuration.', 'Vérifiez la configuration de votre token Airtable.')}</p>
          </div>
        )}
      </div>

      {/* Modal Run */}
      {selectedClient && (
        <RunModal client={selectedClient} onClose={() => setSelectedClient(null)} />
      )}

      {/* Modal Nouveau dossier */}
      {showNewDossier && (
        <NewDossierModal
          onClose={() => setShowNewDossier(false)}
          onCreated={() => {
            setShowNewDossier(false)
            setLoading(true)
            listRecords(TBL_CLIENTS).then(r => setClients(r.filter(x => !EXCLUDED_CLIENT_IDS.has(x.id)))).finally(() => setLoading(false))
          }}
        />
      )}
    </div>
  )
}
