import { create } from 'zustand'
import { mockClients, mockActivities, mockMemories } from '../data/mockData'

const defaultPermissions = {
  saisie_mensuelle: 'autonome',
  revision_balance: 'autonome',
  relances_niveau1: 'autonome',
  relances_niveau2: 'approbation',
  relances_niveau3: 'bloqué',
  cloture_exercice: 'approbation',
  export_fec: 'autonome',
  creation_ecriture: 'approbation',
  modification_ecriture: 'approbation',
  suppression_ecriture: 'bloqué',
  envoi_email_client: 'approbation',
  creation_facture: 'approbation',
}

const mockPendingApprovals = [
  {
    id: 'ap1',
    type: 'cloture_exercice',
    clientId: '1',
    clientNom: 'Bellevoie SARL',
    titre: 'Clôture de l\'exercice 2024',
    description: 'ComptaMind a détecté que toutes les conditions sont réunies pour clôturer l\'exercice 2024. La balance est équilibrée et tous les contrôles sont passés.',
    requestedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    priority: 'haute',
    impact: 'Irréversible — nécessite votre validation',
    icon: '✅',
  },
  {
    id: 'ap2',
    type: 'relances_niveau2',
    clientId: '3',
    clientNom: 'Transports Leblanc SAS',
    titre: 'Relance de niveau 2 — 3 clients',
    description: 'Aucune réponse aux relances niveau 1 envoyées il y a 15 jours. ComptaMind souhaite envoyer une mise en demeure pour 3 factures (total 8 450 €).',
    requestedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    priority: 'moyenne',
    impact: 'Envoi d\'emails aux clients débiteurs',
    icon: '📬',
  },
  {
    id: 'ap3',
    type: 'modification_ecriture',
    clientId: '5',
    clientNom: 'TechStart Innovation',
    titre: 'Correction d\'écriture — Compte 606',
    description: 'ComptaMind a détecté une imputation erronée sur le compte 606 (vs 615 attendu). Il souhaite corriger 2 écritures du mois de mars.',
    requestedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    priority: 'basse',
    impact: 'Modification de 2 écritures existantes',
    icon: '✏️',
  },
]

const mockAutonomousTasks = [
  {
    id: 'at1',
    label: 'Saisie mensuelle automatique',
    description: 'Saisie de tous les dossiers actifs le 10 de chaque mois',
    trigger: 'monthly',
    triggerDay: 10,
    action: 'saisie_mensuelle',
    clientIds: 'all',
    status: 'active',
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    nextRun: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25).toISOString(),
    runsCount: 3,
  },
  {
    id: 'at2',
    label: 'Relances clients automatiques',
    description: 'Détection et envoi des relances niveau 1 chaque lundi',
    trigger: 'weekly',
    triggerDay: 1,
    action: 'relances_niveau1',
    clientIds: 'all',
    status: 'active',
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    nextRun: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    runsCount: 8,
  },
  {
    id: 'at3',
    label: 'Révision balance mensuelle',
    description: 'Révision automatique après chaque saisie mensuelle',
    trigger: 'after_saisie',
    action: 'revision_balance',
    clientIds: 'all',
    status: 'active',
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    nextRun: null,
    runsCount: 3,
  },
  {
    id: 'at4',
    label: 'Export FEC trimestriel',
    description: 'Export automatique du FEC le 1er de chaque trimestre',
    trigger: 'quarterly',
    triggerDay: 1,
    action: 'export_fec',
    clientIds: ['2', '4'],
    status: 'paused',
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    nextRun: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    runsCount: 1,
  },
]

const _storedAuth = localStorage.getItem('comptamind_auth') === 'ok'
const _cabinetName = import.meta.env.VITE_CABINET_NAME || 'Mon Cabinet'

export const useAppStore = create((set, get) => ({
  // Auth — initialisé depuis localStorage pour survivre au refresh
  isAuthenticated: _storedAuth,
  user: _storedAuth ? { prenom: 'Cabinet', nom: _cabinetName, role: 'Expert-comptable' } : null,
  cabinet: _storedAuth ? { nom: _cabinetName } : null,
  onboardingComplete: true, // pas d'onboarding en v1

  // Clients
  clients: mockClients,
  activeClientId: null,

  // Activity
  activities: mockActivities,

  // Memories
  memories: mockMemories,

  // Tasks (AI running tasks)
  runningTasks: [],
  completedTasks: [],

  // Chat messages per context
  chatMessages: {},

  // Permissions/scopes
  permissions: { ...defaultPermissions },
  clientPermissions: {}, // per-client overrides

  // Autonomous tasks
  autonomousTasks: mockAutonomousTasks,

  // Pending approvals
  pendingApprovals: mockPendingApprovals,

  // Actions auth
  login: () => {
    localStorage.setItem('comptamind_auth', 'ok')
    const name = import.meta.env.VITE_CABINET_NAME || 'Mon Cabinet'
    set({
      isAuthenticated: true,
      user: { prenom: 'Cabinet', nom: name, role: 'Expert-comptable' },
      cabinet: { nom: name },
      onboardingComplete: true,
    })
  },
  logout: () => {
    localStorage.removeItem('comptamind_auth')
    set({ isAuthenticated: false, user: null, cabinet: null })
  },

  setActiveClient: (clientId) => set({ activeClientId: clientId }),

  addClient: (client) => set((state) => ({
    clients: [...state.clients, { ...client, id: Date.now().toString(), createdAt: new Date().toISOString(), status: 'nouveau', lastActivity: null, avancement: 0, alertes: 0 }]
  })),

  updateClient: (clientId, updates) => set((state) => ({
    clients: state.clients.map(c => c.id === clientId ? { ...c, ...updates } : c)
  })),

  // Permissions
  setPermission: (action, level) => set((state) => ({
    permissions: { ...state.permissions, [action]: level }
  })),
  setClientPermission: (clientId, action, level) => set((state) => ({
    clientPermissions: {
      ...state.clientPermissions,
      [clientId]: { ...(state.clientPermissions[clientId] || {}), [action]: level }
    }
  })),
  resetClientPermissions: (clientId) => set((state) => {
    const { [clientId]: _, ...rest } = state.clientPermissions
    return { clientPermissions: rest }
  }),

  // Autonomous tasks
  addAutonomousTask: (task) => set((state) => ({
    autonomousTasks: [...state.autonomousTasks, { ...task, id: Date.now().toString(), runsCount: 0, lastRun: null }]
  })),
  toggleAutonomousTask: (taskId) => set((state) => ({
    autonomousTasks: state.autonomousTasks.map(t => t.id === taskId ? { ...t, status: t.status === 'active' ? 'paused' : 'active' } : t)
  })),
  deleteAutonomousTask: (taskId) => set((state) => ({
    autonomousTasks: state.autonomousTasks.filter(t => t.id !== taskId)
  })),

  // Pending approvals
  approveAction: (approvalId) => set((state) => ({
    pendingApprovals: state.pendingApprovals.filter(a => a.id !== approvalId),
    activities: [
      {
        id: Date.now().toString(),
        type: state.pendingApprovals.find(a => a.id === approvalId)?.type?.split('_')[0] || 'action',
        clientId: state.pendingApprovals.find(a => a.id === approvalId)?.clientId,
        clientNom: state.pendingApprovals.find(a => a.id === approvalId)?.clientNom,
        description: `Approuvé : ${state.pendingApprovals.find(a => a.id === approvalId)?.titre}`,
        createdAt: new Date().toISOString(),
        status: 'success',
      },
      ...state.activities,
    ]
  })),
  rejectAction: (approvalId) => set((state) => ({
    pendingApprovals: state.pendingApprovals.filter(a => a.id !== approvalId)
  })),

  // Memory
  addMemory: (clientId, memory) => set((state) => ({
    memories: {
      ...state.memories,
      [clientId]: [...(state.memories[clientId] || []), { ...memory, id: Date.now().toString(), createdAt: new Date().toISOString() }]
    }
  })),
  deleteMemory: (clientId, memoryId) => set((state) => ({
    memories: {
      ...state.memories,
      [clientId]: (state.memories[clientId] || []).filter(m => m.id !== memoryId)
    }
  })),

  addMessage: (contextId, message) => set((state) => ({
    chatMessages: {
      ...state.chatMessages,
      [contextId]: [...(state.chatMessages[contextId] || []), message]
    }
  })),

  addActivity: (activity) => set((state) => ({
    activities: [{ ...activity, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...state.activities]
  })),

  addRunningTask: (task) => set((state) => ({
    runningTasks: [...state.runningTasks, task]
  })),

  completeTask: (taskId, result) => set((state) => ({
    runningTasks: state.runningTasks.filter(t => t.id !== taskId),
    completedTasks: [{ ...state.runningTasks.find(t => t.id === taskId), result, completedAt: new Date().toISOString() }, ...state.completedTasks]
  })),
}))
