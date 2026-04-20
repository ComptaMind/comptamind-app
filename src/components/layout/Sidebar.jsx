import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Bot, Brain, FileText,
  Settings, LogOut, Zap, Bell, ChevronDown, Shield
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/clients', icon: Users, label: 'Mes clients' },
  { to: '/comptamind', icon: Bot, label: 'ComptaMind IA' },
  { to: '/autonomie', icon: Zap, label: 'Mode Autonome' },
  { to: '/autorisations', icon: Shield, label: 'Autorisations' },
  { to: '/memoire', icon: Brain, label: 'Mémoire' },
  { to: '/rapports', icon: FileText, label: 'Rapports' },
]

export default function Sidebar() {
  const { user, cabinet, logout, pendingApprovals } = useAppStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <aside className="w-64 min-h-screen flex flex-col fixed left-0 top-0 z-30" style={{background: '#05070f', borderRight: '1px solid rgba(255,255,255,0.06)'}}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-lg">C</span>
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">ComptaMind</div>
            <div className="text-slate-400 text-xs">IA Comptable</div>
          </div>
        </div>
      </div>

      {/* Cabinet selector */}
      {cabinet && (
        <div className="px-3 py-3 border-b border-white/10">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-400 font-bold text-xs">{cabinet.nom?.slice(0, 2).toUpperCase()}</span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-white text-sm font-medium truncate">{cabinet.nom}</div>
              <div className="text-slate-400 text-xs truncate">{cabinet.plan || 'Plan Essentiel'}</div>
            </div>
            <ChevronDown size={14} className="text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx('sidebar-item', isActive && 'active')
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {to === '/autonomie' && pendingApprovals.length > 0 && (
              <span className="w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                {pendingApprovals.length}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* AI Status */}
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)'}}>
          <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse flex-shrink-0" />
          <span className="text-brand-400 text-xs font-medium">ComptaMind actif</span>
          <Zap size={12} className="text-brand-400 ml-auto" />
        </div>
      </div>

      {/* Settings & User */}
      <div className="px-3 pb-4 space-y-0.5">
        <NavLink
          to="/parametres"
          className={({ isActive }) => clsx('sidebar-item', isActive && 'active')}
        >
          <Settings size={18} />
          <span>Paramètres</span>
        </NavLink>

        <div className="flex items-center gap-3 px-3 py-2.5 mt-2 border-t border-white/10 pt-3">
          <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.prenom?.charAt(0)}{user?.nom?.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{user?.prenom} {user?.nom}</div>
            <div className="text-slate-400 text-xs truncate">{user?.role || 'Expert-comptable'}</div>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors p-1">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
