import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Bot, CheckCircle, AlertTriangle, Clock, ArrowRight,
  TrendingUp, Zap, Calendar, FileText, ChevronRight,
  Activity, Star, RefreshCw
} from 'lucide-react'
import Header from '../components/layout/Header'
import { useAppStore } from '../store/useAppStore'
import { mockStats } from '../data/mockData'

const statusConfig = {
  a_jour: { label: 'À jour', color: 'bg-emerald-100 text-emerald-700' },
  en_cours: { label: 'En cours', color: 'bg-brand-100 text-brand-700' },
  en_retard: { label: 'En retard', color: 'bg-red-100 text-red-700' },
  nouveau: { label: 'Nouveau', color: 'bg-slate-100 text-slate-600' },
}

const activityTypeConfig = {
  saisie: { label: 'Saisie', color: 'bg-blue-100 text-blue-700', icon: '📝' },
  revision: { label: 'Révision', color: 'bg-purple-100 text-purple-700', icon: '🔍' },
  cloture: { label: 'Clôture', color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  relances: { label: 'Relances', color: 'bg-amber-100 text-amber-700', icon: '📬' },
}

function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="card p-5 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp size={12} className="text-emerald-500" />
            <span className="text-xs text-emerald-600 font-medium">{trend}</span>
          </div>
        )}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
    </div>
  )
}

function ActivityItem({ activity }) {
  const typeConf = activityTypeConfig[activity.type] || activityTypeConfig.saisie
  const date = new Date(activity.createdAt)
  const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex items-start gap-4 py-3 border-b border-slate-50 last:border-0 group hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 mt-0.5 bg-slate-100">
        {typeConf.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge ${typeConf.color}`}>{typeConf.label}</span>
          <span className="text-sm font-medium text-slate-700 truncate">{activity.clientNom}</span>
        </div>
        <p className="text-sm text-slate-500 mt-0.5 truncate">{activity.description}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-slate-400">{dateStr}</span>
        {activity.status === 'warning' && <AlertTriangle size={14} className="text-amber-500" />}
        {activity.status === 'success' && <CheckCircle size={14} className="text-emerald-500" />}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { clients, activities, cabinet, user, pendingApprovals } = useAppStore()
  const navigate = useNavigate()

  const stats = mockStats
  const recentClients = clients.slice(0, 4)
  const recentActivities = activities.slice(0, 5)
  const alertClients = clients.filter(c => c.alertes > 0)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div>
      <Header
        title={`${greeting}, ${user?.prenom || 'Marie'} 👋`}
        subtitle={`Voici ce qui se passe dans votre cabinet aujourd'hui.`}
        actions={
          <button onClick={() => navigate('/comptamind')} className="btn-primary">
            <Bot size={16} />
            Lancer ComptaMind
          </button>
        }
      />

      <div className="p-8 space-y-8">
        {/* Alerte banner */}
        {alertClients.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
              <div>
                <span className="text-amber-800 font-semibold text-sm">
                  {alertClients.length} dossier{alertClients.length > 1 ? 's' : ''} nécessite{alertClients.length === 1 ? '' : 'nt'} votre attention
                </span>
                <p className="text-amber-700 text-xs mt-0.5">
                  {alertClients.map(c => c.nom).join(', ')}
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/clients')} className="btn-ghost text-amber-700 text-sm font-medium">
              Voir <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Pending approvals banner */}
        {pendingApprovals?.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">⏳</span>
              </div>
              <div>
                <span className="text-amber-900 font-semibold text-sm">
                  ComptaMind attend votre approbation pour {pendingApprovals.length} action{pendingApprovals.length > 1 ? 's' : ''}
                </span>
                <p className="text-amber-700 text-xs mt-0.5">
                  {pendingApprovals.map(a => a.titre).join(' · ')}
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/autonomie')} className="btn-ghost text-amber-700 text-sm font-medium flex-shrink-0">
              Voir et approuver <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users} label="Total clients" value={clients.length}
            sub={`${clients.filter(c => c.status === 'a_jour').length} à jour`}
            color="bg-brand-100 text-brand-600"
            trend="+2 ce mois"
          />
          <StatCard
            icon={CheckCircle} label="Opérations aujourd'hui" value={stats.operationsAujourdhui}
            sub="Effectuées par ComptaMind"
            color="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            icon={Clock} label="Temps économisé" value={stats.tempsEconomise}
            sub="Cette semaine"
            color="bg-violet-100 text-violet-600"
            trend="vs travail manuel"
          />
          <StatCard
            icon={AlertTriangle} label="Alertes actives" value={stats.alertes}
            sub="Dossiers à traiter"
            color="bg-amber-100 text-amber-600"
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Recent activity */}
          <div className="col-span-2 card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Activité ComptaMind</h2>
                <p className="text-xs text-slate-500 mt-0.5">Dernières opérations effectuées</p>
              </div>
              <button className="btn-ghost text-sm">
                <RefreshCw size={14} />
                Actualiser
              </button>
            </div>
            <div className="space-y-0">
              {recentActivities.map(a => <ActivityItem key={a.id} activity={a} />)}
            </div>
            <button onClick={() => navigate('/rapports')} className="mt-4 w-full py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors flex items-center justify-center gap-1">
              Voir toute l'activité <ChevronRight size={14} />
            </button>
          </div>

          {/* Right: Quick panel */}
          <div className="space-y-4">
            {/* Upcoming deadline */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={16} className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Prochaine échéance</h3>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <div className="text-red-800 font-bold text-sm">15 Avril 2024</div>
                <div className="text-red-600 text-xs mt-0.5">{stats.prochainEcheance.label}</div>
              </div>
              <button onClick={() => navigate('/comptamind')} className="btn-primary w-full mt-3 text-sm py-2">
                <Zap size={14} />
                Préparer avec IA
              </button>
            </div>

            {/* Quick actions */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Actions rapides</h3>
              <div className="space-y-2">
                {[
                  { label: 'Saisie mensuelle', icon: '📝', desc: 'Lancer pour tous les clients', action: () => navigate('/comptamind') },
                  { label: 'Révision balance', icon: '🔍', desc: 'Contrôler les comptes', action: () => navigate('/comptamind') },
                  { label: 'Envoyer relances', icon: '📬', desc: 'Relancer les impayés', action: () => navigate('/comptamind') },
                ].map((item, i) => (
                  <button key={i} onClick={item.action} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group">
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{item.label}</div>
                      <div className="text-xs text-slate-400">{item.desc}</div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500" />
                  </button>
                ))}
              </div>
            </div>

            {/* ComptaMind status */}
            <div className="card p-5 gradient-brand text-white">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={18} />
                <h3 className="text-sm font-bold">ComptaMind</h3>
                <div className="ml-auto w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              </div>
              <p className="text-indigo-200 text-xs mb-3">
                ComptaMind a économisé <span className="text-white font-bold">14h</span> de travail cette semaine
              </p>
              <div className="flex items-center gap-1 text-indigo-200 text-xs">
                <Star size={12} className="fill-current text-yellow-300" />
                <span>Performance : Excellente</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clients overview */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Aperçu des dossiers</h2>
              <p className="text-xs text-slate-500 mt-0.5">Avancement de vos dossiers clients</p>
            </div>
            <button onClick={() => navigate('/clients')} className="btn-secondary text-sm">
              Tous les clients <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {recentClients.map(client => {
              const statusConf = statusConfig[client.status] || statusConfig.nouveau
              return (
                <div
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="p-4 rounded-xl border border-slate-100 hover:border-brand-200 hover:shadow-sm cursor-pointer transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                      <span className="text-slate-600 font-bold text-sm">
                        {client.nom.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span className={`badge ${statusConf.color}`}>{statusConf.label}</span>
                  </div>
                  <div className="font-semibold text-sm text-slate-900 truncate mb-1">{client.nom}</div>
                  <div className="text-xs text-slate-400 mb-3">{client.secteur}</div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">Avancement</span>
                      <span className="text-xs font-bold text-slate-700">{client.avancement}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          client.avancement === 100 ? 'bg-emerald-500' :
                          client.avancement > 50 ? 'bg-brand-500' :
                          client.avancement > 0 ? 'bg-amber-500' : 'bg-slate-200'
                        }`}
                        style={{ width: `${client.avancement}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
