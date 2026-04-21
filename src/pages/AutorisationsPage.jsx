import { useState } from 'react'
import { Shield, ChevronDown, ChevronRight, RotateCcw, User, Lock, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import Header from '../components/layout/Header'
import { useAppStore } from '../store/useAppStore'
import { useAirtableClients } from '../hooks/useAirtableClients'

// ─── Définitions des actions ──────────────────────────────────────────────────

const actionDefinitions = [
  {
    group: 'Saisie & Écritures',
    groupIcon: '📝',
    items: [
      { key: 'saisie_mensuelle', label: 'Saisie mensuelle', description: 'Récupère et saisit automatiquement les écritures depuis relevés et factures', icon: '📝', risk: 'faible', outcome: 'Comptabilité à jour chaque mois' },
      { key: 'creation_ecriture', label: 'Création d\'écritures', description: 'Crée des écritures comptables spécifiques non issues de documents', icon: '✍️', risk: 'moyen', outcome: 'Flexibilité sur les opérations diverses' },
      { key: 'modification_ecriture', label: 'Modification d\'écritures', description: 'Corrige des écritures comptables existantes', icon: '✏️', risk: 'moyen', outcome: 'Correction rapide des erreurs de saisie' },
      { key: 'suppression_ecriture', label: 'Suppression d\'écritures', description: 'Supprime définitivement des écritures comptables', icon: '🗑️', risk: 'élevé', outcome: 'Action irréversible — confirmation obligatoire' },
    ]
  },
  {
    group: 'Révision & Contrôle',
    groupIcon: '🔍',
    items: [
      { key: 'revision_balance', label: 'Révision par la balance', description: 'Analyse la balance générale, détecte les anomalies et les incohérences', icon: '🔍', risk: 'faible', outcome: 'Dossier conforme avant clôture' },
      { key: 'export_fec', label: 'Export FEC', description: 'Génère et exporte le Fichier des Écritures Comptables', icon: '📤', risk: 'faible', outcome: 'FEC disponible à la demande' },
    ]
  },
  {
    group: 'Clôture',
    groupIcon: '🔒',
    items: [
      { key: 'cloture_exercice', label: 'Clôture de l\'exercice', description: 'Passe les écritures d\'inventaire, provisions et clôture définitive', icon: '🔒', risk: 'élevé', outcome: 'Action irréversible — votre validation est requise' },
    ]
  },
  {
    group: 'Facturation',
    groupIcon: '🧾',
    items: [
      { key: 'creation_facture', label: 'Création de factures', description: 'Génère de nouvelles factures clients dans Pennylane', icon: '🧾', risk: 'moyen', outcome: 'Facturation automatique selon les règles définies' },
    ]
  },
  {
    group: 'Relances clients',
    groupIcon: '📬',
    items: [
      { key: 'relances_niveau1', label: 'Relance amiable', description: 'Rappel poli pour factures en retard (< 30 jours)', icon: '💬', risk: 'faible', outcome: 'Récupération automatique des créances courantes' },
      { key: 'relances_niveau2', label: 'Mise en demeure', description: 'Relance ferme pour factures en retard (30–60 jours)', icon: '📬', risk: 'moyen', outcome: 'Accélère le recouvrement sans intervention manuelle' },
      { key: 'relances_niveau3', label: 'Relance contentieux', description: 'Mise en demeure formelle avec mention de poursuites', icon: '⚖️', risk: 'élevé', outcome: 'Engagement juridique — votre accord est indispensable' },
      { key: 'envoi_email_client', label: 'Emails aux clients', description: 'Envoi direct d\'emails au nom de votre cabinet', icon: '✉️', risk: 'moyen', outcome: 'Communication client automatisée' },
    ]
  },
]

// ─── Config niveaux ───────────────────────────────────────────────────────────

const levelConfig = {
  autonome: {
    label: 'Automatique',
    shortLabel: 'Auto',
    desc: 'ComptaMind agit seul, sans vous déranger',
    icon: CheckCircle,
    ring: 'ring-2 ring-emerald-500',
    activeBg: 'bg-emerald-500',
    activeText: 'text-white',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
    riskLabel: 'Risque faible',
  },
  approbation: {
    label: 'Approbation',
    shortLabel: 'Approval',
    desc: 'ComptaMind vous demande votre accord avant d\'agir',
    icon: AlertTriangle,
    ring: 'ring-2 ring-amber-400',
    activeBg: 'bg-amber-400',
    activeText: 'text-white',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-400',
    riskLabel: 'Risque moyen',
  },
  bloqué: {
    label: 'Bloqué',
    shortLabel: 'Bloqué',
    desc: 'ComptaMind ne peut jamais effectuer cette action',
    icon: Lock,
    ring: 'ring-2 ring-red-400',
    activeBg: 'bg-red-400',
    activeText: 'text-white',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-400',
    riskLabel: 'Risque élevé',
  },
}

const riskStyle = {
  faible: { dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  moyen:  { dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-100' },
  élevé:  { dot: 'bg-red-400',     text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-100' },
}

// ─── Toggle de niveau ─────────────────────────────────────────────────────────

function LevelToggle({ value, onChange, compact = false }) {
  const levels = ['autonome', 'approbation', 'bloqué']
  return (
    <div className={`flex items-center gap-1 bg-slate-100 rounded-xl p-1 ${compact ? 'text-xs' : ''}`}>
      {levels.map(level => {
        const conf = levelConfig[level]
        const isActive = value === level
        const Icon = conf.icon
        return (
          <button
            key={level}
            onClick={() => onChange(level)}
            title={conf.desc}
            className={`flex items-center gap-1.5 rounded-lg font-semibold transition-all ${
              compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs'
            } ${isActive
              ? `${conf.activeBg} ${conf.activeText} shadow-sm`
              : 'text-slate-400 hover:text-slate-600 hover:bg-white/60'
            }`}
          >
            <Icon size={compact ? 10 : 11} />
            {compact ? conf.shortLabel : conf.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Ligne d'action ───────────────────────────────────────────────────────────

function ActionRow({ actionKey, definition, permission, onChangeGlobal, clientOverride, onChangeClient, clients }) {
  const [expanded, setExpanded] = useState(false)
  const conf = levelConfig[permission]
  const Icon = conf.icon
  const rs = riskStyle[definition.risk]

  return (
    <div className={`bg-white rounded-xl border transition-all ${expanded ? 'border-brand-200 shadow-sm' : 'border-slate-100 hover:border-slate-200'}`}>
      {/* Row principale */}
      <div className="flex items-center gap-4 p-4">
        <span className="text-xl flex-shrink-0 w-8 text-center">{definition.icon}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{definition.label}</span>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${rs.bg} ${rs.text} ${rs.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${rs.dot}`} />
              Risque {definition.risk}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate">{definition.outcome}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Indicateur niveau actuel (mobile-friendly) */}
          <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${conf.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
            {conf.label}
          </span>

          <LevelToggle value={permission} onChange={onChangeGlobal} />

          {clients.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Exceptions par client"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Description détaillée */}
      <div className="px-4 pb-3 -mt-1">
        <p className="text-xs text-slate-400">{definition.description}</p>
      </div>

      {/* Exceptions par client */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 rounded-b-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={12} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Règles par dossier</span>
            <span className="text-xs text-slate-400">(surcharge la règle globale)</span>
          </div>
          <div className="space-y-2">
            {clients.map(client => {
              const clientPerm = clientOverride?.[client.id]?.[actionKey] || permission
              const isOverridden = !!clientOverride?.[client.id]?.[actionKey]
              return (
                <div key={client.id} className="flex items-center gap-3 py-1.5 px-3 bg-white rounded-lg border border-slate-100">
                  <div className="w-6 h-6 rounded-md gradient-brand flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold leading-none">{client.nom.slice(0, 1).toUpperCase()}</span>
                  </div>
                  <span className="text-xs font-medium text-slate-700 flex-1 truncate">{client.nom}</span>
                  <LevelToggle
                    compact
                    value={clientPerm}
                    onChange={(level) => onChangeClient(client.id, actionKey, level === permission ? null : level)}
                  />
                  {isOverridden && (
                    <button
                      onClick={() => onChangeClient(client.id, actionKey, null)}
                      className="text-slate-300 hover:text-red-400 transition-colors"
                      title="Réinitialiser"
                    >
                      <RotateCcw size={11} />
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

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AutorisationsPage() {
  const { permissions, clientPermissions, setPermission, setClientPermission } = useAppStore()
  const { clients } = useAirtableClients()

  // Stats
  const allKeys = actionDefinitions.flatMap(g => g.items.map(i => i.key))
  const counts = allKeys.reduce((acc, key) => {
    const v = permissions[key] || 'approbation'
    acc[v] = (acc[v] || 0) + 1
    return acc
  }, {})

  const riskSummary = [
    {
      level: 'autonome',
      label: 'Automatique',
      sublabel: 'ComptaMind agit seul',
      count: counts.autonome || 0,
      icon: CheckCircle,
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      iconColor: 'text-emerald-600',
      countColor: 'text-emerald-700',
    },
    {
      level: 'approbation',
      label: 'Approbation requise',
      sublabel: 'Votre accord est demandé',
      count: counts.approbation || 0,
      icon: AlertTriangle,
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      iconColor: 'text-amber-600',
      countColor: 'text-amber-700',
    },
    {
      level: 'bloqué',
      label: 'Bloqué',
      sublabel: 'Action interdite',
      count: counts['bloqué'] || 0,
      icon: Lock,
      bg: 'bg-red-50',
      border: 'border-red-100',
      iconColor: 'text-red-500',
      countColor: 'text-red-700',
    },
  ]

  return (
    <div>
      <Header
        title="Autorisations ComptaMind"
        subtitle="Définissez précisément ce que l'IA peut faire seule, avec votre accord, ou jamais"
      />

      <div className="p-8 max-w-5xl space-y-8">

        {/* ── Résumé visuel ── */}
        <div className="grid grid-cols-3 gap-4">
          {riskSummary.map(item => {
            const Icon = item.icon
            return (
              <div key={item.level} className={`rounded-2xl p-5 border flex items-center gap-4 ${item.bg} ${item.border}`}>
                <div className="flex-1">
                  <p className={`text-3xl font-black ${item.countColor}`}>{item.count}</p>
                  <p className={`text-sm font-semibold ${item.countColor} mt-0.5`}>{item.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.sublabel}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center flex-shrink-0`}>
                  <Icon size={22} className={item.iconColor} />
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Légende niveaux ── */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Comment ça fonctionne</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(levelConfig).map(([key, conf]) => {
              const Icon = conf.icon
              return (
                <div key={key} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${conf.activeBg}`}>
                    <Icon size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{conf.label}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{conf.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Groupes d'actions ── */}
        <div className="space-y-8">
          {actionDefinitions.map(group => (
            <div key={group.group}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{group.groupIcon}</span>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{group.group}</h2>
              </div>
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
