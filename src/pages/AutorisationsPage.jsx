import { useState } from 'react'
import { Shield, ChevronDown, ChevronRight, RotateCcw, User, Lock, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import Header from '../components/layout/Header'
import { useAppStore } from '../store/useAppStore'
import { useAirtableClients } from '../hooks/useAirtableClients'
import { useT } from '../hooks/useT'

// ─── Définitions des actions ──────────────────────────────────────────────────

const actionDefinitionsEn = [
  {
    group: 'Entry & Journal',
    groupIcon: '📝',
    items: [
      { key: 'saisie_mensuelle', label: 'Monthly entry', description: 'Automatically retrieves and posts entries from bank statements and invoices', icon: '📝', risk: 'faible', outcome: 'Accounting up to date every month' },
      { key: 'creation_ecriture', label: 'Create entries', description: 'Creates specific accounting entries not originating from documents', icon: '✍️', risk: 'moyen', outcome: 'Flexibility for miscellaneous operations' },
      { key: 'modification_ecriture', label: 'Edit entries', description: 'Corrects existing accounting entries', icon: '✏️', risk: 'moyen', outcome: 'Quick correction of data entry errors' },
      { key: 'suppression_ecriture', label: 'Delete entries', description: 'Permanently deletes accounting entries', icon: '🗑️', risk: 'élevé', outcome: 'Irreversible action — confirmation required' },
    ]
  },
  {
    group: 'Review & Control',
    groupIcon: '🔍',
    items: [
      { key: 'revision_balance', label: 'Balance sheet review', description: 'Analyzes the general balance, detects anomalies and inconsistencies', icon: '🔍', risk: 'faible', outcome: 'File compliant before closing' },
      { key: 'export_fec', label: 'FEC export', description: 'Generates and exports the accounting entries file (FEC)', icon: '📤', risk: 'faible', outcome: 'FEC available on demand' },
    ]
  },
  {
    group: 'Year-end closing',
    groupIcon: '🔒',
    items: [
      { key: 'cloture_exercice', label: 'Year-end closing', description: 'Posts year-end adjustments, provisions and definitive closing entries', icon: '🔒', risk: 'élevé', outcome: 'Irreversible action — your approval is required' },
    ]
  },
  {
    group: 'Invoicing',
    groupIcon: '🧾',
    items: [
      { key: 'creation_facture', label: 'Create invoices', description: 'Generates new client invoices in Pennylane', icon: '🧾', risk: 'moyen', outcome: 'Automatic invoicing according to defined rules' },
    ]
  },
  {
    group: 'Client reminders',
    groupIcon: '📬',
    items: [
      { key: 'relances_niveau1', label: 'Friendly reminder', description: 'Polite reminder for overdue invoices (< 30 days)', icon: '💬', risk: 'faible', outcome: 'Automatic recovery of current receivables' },
      { key: 'relances_niveau2', label: 'Formal notice', description: 'Firm reminder for overdue invoices (30–60 days)', icon: '📬', risk: 'moyen', outcome: 'Accelerates collection without manual intervention' },
      { key: 'relances_niveau3', label: 'Legal reminder', description: 'Formal notice with mention of legal proceedings', icon: '⚖️', risk: 'élevé', outcome: 'Legal commitment — your agreement is essential' },
      { key: 'envoi_email_client', label: 'Client emails', description: 'Direct emails sent on behalf of your firm', icon: '✉️', risk: 'moyen', outcome: 'Automated client communication' },
    ]
  },
]

const actionDefinitionsFr = [
  {
    group: 'Saisie & Journal',
    groupIcon: '📝',
    items: [
      { key: 'saisie_mensuelle', label: 'Saisie mensuelle', description: 'Récupère et saisit automatiquement les écritures depuis les relevés bancaires et factures', icon: '📝', risk: 'faible', outcome: 'Comptabilité à jour chaque mois' },
      { key: 'creation_ecriture', label: 'Créer des écritures', description: "Crée des écritures comptables spécifiques ne provenant pas de documents", icon: '✍️', risk: 'moyen', outcome: 'Flexibilité pour les opérations diverses' },
      { key: 'modification_ecriture', label: 'Modifier des écritures', description: 'Corrige les écritures comptables existantes', icon: '✏️', risk: 'moyen', outcome: 'Correction rapide des erreurs de saisie' },
      { key: 'suppression_ecriture', label: 'Supprimer des écritures', description: 'Supprime définitivement des écritures comptables', icon: '🗑️', risk: 'élevé', outcome: 'Action irréversible — confirmation requise' },
    ]
  },
  {
    group: 'Révision & Contrôle',
    groupIcon: '🔍',
    items: [
      { key: 'revision_balance', label: 'Révision balance', description: 'Analyse la balance générale, détecte les anomalies et incohérences', icon: '🔍', risk: 'faible', outcome: 'Dossier conforme avant clôture' },
      { key: 'export_fec', label: 'Export FEC', description: "Génère et exporte le fichier des écritures comptables (FEC)", icon: '📤', risk: 'faible', outcome: 'FEC disponible à la demande' },
    ]
  },
  {
    group: 'Clôture annuelle',
    groupIcon: '🔒',
    items: [
      { key: 'cloture_exercice', label: "Clôture d'exercice", description: 'Saisit les ajustements de fin d\'exercice, provisions et écritures de clôture définitives', icon: '🔒', risk: 'élevé', outcome: 'Action irréversible — votre approbation est requise' },
    ]
  },
  {
    group: 'Facturation',
    groupIcon: '🧾',
    items: [
      { key: 'creation_facture', label: 'Créer des factures', description: 'Génère de nouvelles factures clients dans Pennylane', icon: '🧾', risk: 'moyen', outcome: 'Facturation automatique selon les règles définies' },
    ]
  },
  {
    group: 'Relances clients',
    groupIcon: '📬',
    items: [
      { key: 'relances_niveau1', label: 'Relance douce', description: 'Rappel poli pour les factures en retard (< 30 jours)', icon: '💬', risk: 'faible', outcome: 'Recouvrement automatique des créances courantes' },
      { key: 'relances_niveau2', label: 'Mise en demeure', description: 'Rappel ferme pour les factures en retard (30–60 jours)', icon: '📬', risk: 'moyen', outcome: 'Accélère le recouvrement sans intervention manuelle' },
      { key: 'relances_niveau3', label: 'Relance juridique', description: 'Mise en demeure formelle avec mention de poursuites judiciaires', icon: '⚖️', risk: 'élevé', outcome: "Engagement juridique — votre accord est indispensable" },
      { key: 'envoi_email_client', label: 'Emails clients', description: 'Emails directs envoyés au nom de votre cabinet', icon: '✉️', risk: 'moyen', outcome: 'Communication client automatisée' },
    ]
  },
]

// ─── Config niveaux ───────────────────────────────────────────────────────────

const levelConfigEn = {
  autonome: {
    label: 'Automatic',
    shortLabel: 'Auto',
    desc: 'ComptaMind acts on its own, without disturbing you',
    icon: CheckCircle,
    ring: 'ring-2 ring-emerald-500',
    activeBg: 'bg-emerald-500',
    activeText: 'text-white',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
    riskLabel: 'Low risk',
  },
  approbation: {
    label: 'Approval',
    shortLabel: 'Approval',
    desc: 'ComptaMind asks for your agreement before acting',
    icon: AlertTriangle,
    ring: 'ring-2 ring-amber-400',
    activeBg: 'bg-amber-400',
    activeText: 'text-white',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-400',
    riskLabel: 'Medium risk',
  },
  bloqué: {
    label: 'Blocked',
    shortLabel: 'Blocked',
    desc: 'ComptaMind can never perform this action',
    icon: Lock,
    ring: 'ring-2 ring-red-400',
    activeBg: 'bg-red-400',
    activeText: 'text-white',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-400',
    riskLabel: 'High risk',
  },
}

const levelConfigFr = {
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
    shortLabel: 'Approbation',
    desc: 'ComptaMind demande votre accord avant d\'agir',
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
  const t = useT()
  const levelConfig = t(levelConfigEn, levelConfigFr)
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
  const t = useT()
  const levelConfig = t(levelConfigEn, levelConfigFr)
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
              {definition.risk === 'faible' ? t('Low risk', 'Risque faible') : definition.risk === 'moyen' ? t('Medium risk', 'Risque moyen') : t('High risk', 'Risque élevé')}
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
            <span className="text-xs font-semibold text-slate-500">{t('Rules per file', 'Règles par dossier')}</span>
            <span className="text-xs text-slate-400">{t('(overrides the global rule)', '(remplace la règle globale)')}</span>
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
  const t = useT()
  const levelConfig = t(levelConfigEn, levelConfigFr)
  const actionDefinitions = t(actionDefinitionsEn, actionDefinitionsFr)
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
      label: t('Automatic', 'Automatique'),
      sublabel: t('ComptaMind acts alone', 'ComptaMind agit seul'),
      count: counts.autonome || 0,
      icon: CheckCircle,
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      iconColor: 'text-emerald-600',
      countColor: 'text-emerald-700',
    },
    {
      level: 'approbation',
      label: t('Approval required', 'Approbation requise'),
      sublabel: t('Your agreement is requested', 'Votre accord est demandé'),
      count: counts.approbation || 0,
      icon: AlertTriangle,
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      iconColor: 'text-amber-600',
      countColor: 'text-amber-700',
    },
    {
      level: 'bloqué',
      label: t('Blocked', 'Bloqué'),
      sublabel: t('Action not allowed', 'Action non autorisée'),
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
        title={t('ComptaMind Permissions', 'Autorisations ComptaMind')}
        subtitle={t('Define precisely what the AI can do alone, with your approval, or never', "Définissez précisément ce que l'IA peut faire seule, avec votre approbation, ou jamais")}
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
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('How it works', 'Comment ça fonctionne')}</span>
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
