import { useState } from 'react'
import { Brain, Plus, Trash2, Edit, Search, Filter } from 'lucide-react'
import Header from '../components/layout/Header'
import { useAppStore } from '../store/useAppStore'
import { useAirtableClients } from '../hooks/useAirtableClients'

const catConfig = {
  note: { label: 'Note', emoji: '📝', color: 'bg-blue-50 border-blue-100', badge: 'bg-blue-100 text-blue-700' },
  instruction: { label: 'Instruction', emoji: '⚡', color: 'bg-amber-50 border-amber-100', badge: 'bg-amber-100 text-amber-700' },
  preference: { label: 'Preference', emoji: '⭐', color: 'bg-violet-50 border-violet-100', badge: 'bg-violet-100 text-violet-700' },
}

export default function MemoryPage() {
  const [selectedClient, setSelectedClient] = useState('global')
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [newMem, setNewMem] = useState({ titre: '', contenu: '', categorie: 'note' })

  const { memories, addMemory, deleteMemory } = useAppStore()
  const { clients } = useAirtableClients()

  const contextMemories = memories[selectedClient] || []
  const filtered = contextMemories.filter(m =>
    m.titre.toLowerCase().includes(search.toLowerCase()) ||
    m.contenu.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = () => {
    if (newMem.titre && newMem.contenu) {
      addMemory(selectedClient, newMem)
      setNewMem({ titre: '', contenu: '', categorie: 'note' })
      setShowAdd(false)
    }
  }

  const totalMemories = Object.values(memories).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div>
      <Header
        title="ComptaMind Memory"
        subtitle={`${totalMemories} memory entr${totalMemories > 1 ? 'ies' : 'y'} saved`}
        actions={
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={16} /> Add memory
          </button>
        }
      />

      <div className="p-8">
        {/* Context selector */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit flex-wrap">
          <button
            onClick={() => setSelectedClient('global')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedClient === 'global' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            🌐 Firm (global)
          </button>
          {clients.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedClient(c.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${selectedClient === c.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              <span className="text-xs bg-slate-200 text-slate-600 rounded px-1.5 py-0.5 font-bold">
                {c.nom.slice(0, 2).toUpperCase()}
              </span>
              {c.nom}
              {(memories[c.id] || []).length > 0 && (
                <span className="text-xs bg-brand-100 text-brand-700 rounded-full px-1.5 font-bold">
                  {(memories[c.id] || []).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Info banner */}
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Brain size={18} className="text-brand-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-brand-900">
              {selectedClient === 'global' ? 'Global firm memory' : `Memory specific to ${clients.find(c => c.id === selectedClient)?.nom}`}
            </div>
            <p className="text-xs text-brand-700 mt-0.5">
              {selectedClient === 'global'
                ? 'These instructions and preferences apply to all client files in your firm. ComptaMind takes them into account for every action.'
                : 'This information is specific to this file. ComptaMind consults it automatically before each action on this client.'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search in memory..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="card p-5 mb-6 border-brand-200 ring-1 ring-brand-100 bg-white">
            <h3 className="text-sm font-bold text-slate-900 mb-4">New memory entry</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="label">Title</label>
                  <input className="input" placeholder="e.g.: Invoicing preference"
                    value={newMem.titre} onChange={e => setNewMem({...newMem, titre: e.target.value})} />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={newMem.categorie} onChange={e => setNewMem({...newMem, categorie: e.target.value})}>
                    <option value="note">📝 Note</option>
                    <option value="instruction">⚡ Instruction</option>
                    <option value="preference">⭐ Preference</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Content</label>
                <textarea className="input resize-none" rows={3}
                  placeholder="Describe the instruction, preference or information to remember..."
                  value={newMem.contenu} onChange={e => setNewMem({...newMem, contenu: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm py-2">Cancel</button>
                <button onClick={handleAdd} disabled={!newMem.titre || !newMem.contenu} className="btn-primary text-sm py-2">
                  <Brain size={14} /> Save to memory
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Memory cards */}
        {filtered.length === 0 ? (
          <div className="card p-14 text-center">
            <div className="text-5xl mb-4">🧠</div>
            <p className="text-slate-600 font-semibold text-lg">No memories saved</p>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
              Add instructions, preferences and information to customize ComptaMind's behavior.
            </p>
            <button onClick={() => setShowAdd(true)} className="btn-primary mt-5 mx-auto">
              <Plus size={16} /> Add the first entry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(mem => {
              const cat = catConfig[mem.categorie] || catConfig.note
              return (
                <div key={mem.id} className={`p-5 rounded-xl border group hover:shadow-md transition-all ${cat.color}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cat.emoji}</span>
                      <span className={`badge ${cat.badge}`}>{cat.label}</span>
                    </div>
                    <button
                      onClick={() => deleteMemory(selectedClient, mem.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-white/60 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-2">{mem.titre}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{mem.contenu}</p>
                  <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-white/50">
                    Saved on {new Date(mem.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
