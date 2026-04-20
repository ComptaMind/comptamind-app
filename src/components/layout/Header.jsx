import { Bell, Search, ChevronRight } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export default function Header({ title, subtitle, breadcrumbs = [], actions }) {
  const { activities } = useAppStore()
  const alertCount = activities.filter(a => a.status === 'warning').length

  return (
    <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
      <div>
        {breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 mb-1">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={12} className="text-slate-400" />}
                <span className={`text-xs ${i === breadcrumbs.length - 1 ? 'text-slate-500 font-medium' : 'text-slate-400'}`}>
                  {b}
                </span>
              </span>
            ))}
          </div>
        )}
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell size={20} />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
