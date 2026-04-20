import { useState } from 'react'
import { Shield, ChevronDown, ChevronRight, Info, RotateCcw, User } from 'lucide-react'
import Header from '../components/layout/Header'
import { useAppStore } from '../store/useAppStore'

const actionDefinitions = [
  {
    group: 'Saisie & Écritures',
    items: [
      {
        key: 'saisie_mensuelle',
        label: 'Saisie mensuelle',
        description: 'Saisie automatique des écritures à partir des relevés bancaires et factures',
        icon: '📝',
        risk: 'faible',
      },
      {
        key: 'creation_ecriture',
        label: 'Création d\'écritures manuelles',
        description: 'Création d\'écritures comptables spécifiques non issues de documents',
        icon: '✍️',
        risk: 'moyen',
      },
      {
        key: 'modification_ecriture',
        label: 'Modification d\'écritures',
        description: 'Correction ou modification d\'écritures comptables existantes',
        icon: '✏️',
        risk: 'moyen',
      },
      {
        key: 'suppression_ecriture',
        label: 'Suppression d\'écritures',
        description: 'Suppression définitive d\'écritures comptables',
        icon: '🗑️',
        risk: 'élevé',
      },
    ]
  },
  {
    group: 'Révision & Contrôle',
    items: [
      {
        key: 'revision_balance',
        label: 'Révision par la balance',
        description: 'Analyse et contrôle de la balance générale, détection d\'anomalies',
        icon: '🔍',
        risk: 'faible',
      },
      {
        key: 'export_fec',
        label: 'Export FEC',
        description: 'Génération et export du Fichier des Écritures Comptables',
        icon: '📤',
        risk: 'faible',
      },
    ]
  },
  {
    group: 'Clôture',
    items: [
      {
        key: 'cloture_exercice',
        label: 'Clôture de l\'exercice',
        description: 'Passage des écritures d\'inventaire, provisions et clôture définitive',
        icon: '🔒',
        risk: 'élevé',
      },
    ]
  },
  {
    group: 'Facturation',
    items: [
      {
        key: 'creation_facture',
        label: 'Création de factures',
        description: 'Génération de nouvelles factures clients',
        icon: '🧾',
        risk: 'moyen',
      },
    ]
  },
  {
    group: 'Relances clients',
    items: [
      {
        key: 'relances_niveau1',
        label: 'Relance niveau 1 — Amiable',
        description: 'Rappel poli pour les factures en retard de moins de 30 jours',
        icon: '💬',
        risk: 'faible',
      },
      {
        key: 'relances_niveau2',
        label: 'Relance niveau 2 — Ferme',
        description: 'Mise en demeure pour factures en retard de 30 à 60 jours',
        icon: '📬',
        risk: 'moyen',
      },
      {
        key: 'relances_niveau3',
        label: 'Relance niveau 3 — Contentieux',
        description: 'Mise en demeure formelle avec mention de poursuites judiciaires',
        icon: '⚖️',
        risk: 'élevé',
      },
      {
        key: 'envoi_email_client',
        label: 'Envoi d\'emails aux clients',
        description: 'Envoi direct d\'emails au nom du cabinet',
        icon: '✉️',
        risk: 'moyen',
      },
    ]
  },
]

const levelConfig = {
  autonome: {
    label: 'Autonome',
    desc: 'ComptaMind agit seul, sans vous demander',
    color: 'bg-emerald-500',
    bgActive: 'bg-emerald-50 border-emerald-300',
    textActive: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  approbation: {
    label: 'Approbation requise',
    desc: 'ComptaMind vous demande votre accord avant d\'agir',
    color: 'bg-amber-500',
    bgActive: 'bg-amber-50 border-amber-300',
    textActive: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
  bloqué: {
    label: 'Bloqué',
    desc: 'ComptaMind ne peut jamais effectuer cette action',
    color: 'bg-red-400',
    bgActive: 'bg-red-50 border-red-300',
    textActive: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-400',
  },
}

const riskConfig = {
  faible: 'bg-emerald-100 text-emerald-700',
  moyen: 'bg-amber-100 text-amber-700',
  élevé: 'bg-red-100 text-red-700',
}

function LevelToggle({ value, onChange }) {
  const levels = ['autonome', 'approbation', 'bloqué']
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      {levels.map(level => {
        const conf = levelConfig[level]
        const isActive = value === level
        return (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? `bg-white shadow-sm ${conf.textActive} border ${conf.bgActive.split(' ')[1]}`
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? conf.dot : 'bg-slate-300'}`} />
            {conf.label}
          </button>
        )
      })}
    </div>
  )
}

function ActionRow({ actionKey, definition, permission, onChangeGlobal, clientOverride, onChangeClient, clients }) {
  const [expanded, setExpanded] = useState(false)
  const conf = levelConfig[permission]

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden hover:border-slate-200 transition-colors">
      <div className="flex items-center gap-4 p-4 bg-white">
        <span className="text-2xl flex-shrink-0">{definition.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{definition.label}</span>
            <span className={`badge ${riskConfig[definition.risk]}`}>Risque {definition.risk}</span>
            <span className={`badge ${conf.badge}`}>{conf.label}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{definition.description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <LevelToggle value={permission} onChange={onChangeGlobal} />
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Exceptions par client"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="bg-slate-50 border-t border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={13} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Exceptions par client</span>
            <span className="text-xs text-slate-400">(surcharge la règle globale)</span>
          </div>
          <div className="space-y-2">
            {clients.map(client => {
              const clientPerm = clientOverride?.[client.id]?.[actionKey] || permission
              const isOverridden = !!clientOverride?.[client.id]?.[actionKey]
              return (
                <div key={client.id} className="flex items-center gap-3 py-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-slate-600 text-xs font-bold">{client.nom.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <span className="text-xs font-medium text-slate-700 w-40 truncate">{client.nom}</span>
                  <LevelToggle
                    value={clientPerm}
                    onChange={(level) => onChangeClient(client.id, actionKey, level === permission ? null : level)}
                  />
                  {isOverridden && (
                    <button
                      onClick={() => onChangeClient(client.id, actionKey, null)}
                      className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
                    >
                      <RotateCcw size={10} /> Réinitialiser
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AutorisationsPage() {
  const { permissions, clientPermissions, setPermission, setClientPermission, clients } = useAppStore()

  const counts = Object.values(permissions).reduce((acc, v) => {
    acc[v] = (acc[v] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <Header
        title="Autorisations ComptaMind"
        subtitle="Définissez ce que ComptaMind peut faire seul, ce qui nécessite votre accord, et ce qui est interdit"
      />

      <div className="p-8 max-w-5xl">
        {/* Explanation banner */}
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-5 mb-8 flex gap-4">
          <Shield size={22} className="text-brand-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-brand-900 mb-1">Comment fonctionnent les autorisations ?</h3>
            <p className="text-sm text-brand-700 leading-relaxed">
              Chaque action de ComptaMind peut être configurée avec 3 niveaux :
              <strong className="text-emerald-700"> Autonome</strong> (il agit seul),
              <strong className="text-amber-700"> Approbation requise</strong> (il vous demande votre accord),
              ou <strong className="text-red-600"> Bloqué</strong> (action interdite).
              Vous pouvez aussi définir des exceptions par client.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { level: 'autonome', label: 'Actions autonomes', icon: '🟢' },
            { level: 'approbation', label: 'Nécessitent approbation', icon: '🟡' },
            { level: 'bloqué', label: 'Actions bloquées', icon: '🔴' },
          ].map(item => (
            <div key={item.level} className="card p-4 text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-2xl font-bold text-slate-900">{counts[item.level] || 0}</div>
              <div className="text-xs text-slate-500">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Action groups */}
        <div className="space-y-8">
          {actionDefinitions.map(group => (
            <div key={group.group}>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">{group.group}</h2>
              <div className="space-y-2">
                {group.items.map(item => (
                  <ActionRow
                    key={item.key}
                    actionKey={item.key}
                    definition={item}
                    permission={permissions[item.key] || 'approbation'}
                    onChangeGlobal={(level) => setPermission(item.key, level)}
                    clientOverride={clientPermissions}
                    onChangeClient={(clientId, key, level) => {
                      if (level === null) {
                        // reset
                        const newCP = { ...clientPermissions }
                        if (newCP[clientId]) {
                          const { [key]: _, ...rest } = newCP[clientId]
                          newCP[clientId] = rest
                        }
                        useAppStore.setState({ clientPermissions: newCP })
                      } else {
                        setClientPermission(clientId, key, level)
                      }
                    }}
                    clients={clients}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
