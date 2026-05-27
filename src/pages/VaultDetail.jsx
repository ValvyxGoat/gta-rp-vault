import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Minus, DollarSign, Package,
  TrendingUp, TrendingDown, Vault, Search, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { formatMoney, formatRelative } from '../lib/utils'
import AddItemModal from '../components/modals/AddItemModal'
import WithdrawItemModal from '../components/modals/WithdrawItemModal'
import MoneyModal from '../components/modals/MoneyModal'

const CATEGORY_COLORS = {
  'Armes': 'text-accent-red bg-accent-red/10',
  'Drogues': 'text-accent-orange bg-accent-orange/10',
  'Objets': 'text-accent-green bg-accent-green/10',
  'Munitions': 'text-accent-gold bg-accent-gold/10',
  'Équipement': 'text-blue-400 bg-blue-400/10',
}

export default function VaultDetail() {
  const { id } = useParams()
  const [vault, setVault] = useState(null)
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [tab, setTab] = useState('items') // 'items' | 'money'
  const [moneyLogs, setMoneyLogs] = useState([])

  // Modals
  const [addItem, setAddItem] = useState(false)
  const [withdrawItem, setWithdrawItem] = useState(null) // item object
  const [moneyModal, setMoneyModal] = useState(null) // 'deposit' | 'withdraw'

  const fetchAll = useCallback(async () => {
    const [
      { data: v },
      { data: its },
      { data: cats },
      { data: mls },
    ] = await Promise.all([
      supabase.from('vaults').select('*').eq('id', id).single(),
      supabase.from('items').select('*, categories(name, color)').eq('vault_id', id).order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('money_logs').select('*').eq('vault_id', id).order('created_at', { ascending: false }).limit(20),
    ])
    if (!v) { toast.error('Coffre introuvable'); return }
    setVault(v)
    setItems(its || [])
    setCategories(cats || [])
    setMoneyLogs(mls || [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Filtrage des items
  const filteredItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || item.categories?.name === filterCat
    return matchSearch && matchCat
  })

  const catNames = [...new Set(items.map(i => i.categories?.name).filter(Boolean))]

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-panel rounded" />
        <div className="h-32 bg-panel rounded-xl" />
        <div className="h-64 bg-panel rounded-xl" />
      </div>
    )
  }

  if (!vault) return null

  return (
    <div className="space-y-5">
      {/* Back + title */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
        <Link to="/vaults" className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-display text-4xl tracking-widest">{vault.name.toUpperCase()}</h1>
          {vault.location && <p className="text-xs text-text-muted">📍 {vault.location}</p>}
        </div>
      </motion.div>

      {/* Money hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card glow-border-gold border-accent-gold/20 bg-gradient-to-br from-panel to-[#141206]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Argent du coffre</p>
            <div className="font-display text-5xl text-accent-gold tracking-wider">{formatMoney(vault.money)}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMoneyModal('deposit')} className="btn-secondary border-accent-green/30 text-accent-green hover:bg-accent-green/10">
              <TrendingUp className="w-4 h-4" /> Dépôt
            </button>
            <button onClick={() => setMoneyModal('withdraw')} className="btn-secondary border-accent-red/30 text-accent-red hover:bg-accent-red/10">
              <TrendingDown className="w-4 h-4" /> Retrait
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
        {[
          { key: 'items', label: 'Objets', icon: Package },
          { key: 'money', label: 'Mouvements $', icon: DollarSign },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm transition-all ${
              tab === key ? 'bg-accent-red text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'items' && (
          <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-1 w-full">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    className="input pl-8"
                    placeholder="Rechercher..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {catNames.length > 0 && (
                  <select
                    value={filterCat}
                    onChange={e => setFilterCat(e.target.value)}
                    className="input w-auto"
                  >
                    <option value="all">Toutes catégories</option>
                    {catNames.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <button onClick={() => setAddItem(true)} className="btn-primary whitespace-nowrap">
                <Plus className="w-4 h-4" /> Ajouter objet
              </button>
            </div>

            {/* Items grid */}
            {filteredItems.length === 0 ? (
              <div className="card text-center py-12">
                <Package className="w-10 h-10 text-text-muted mx-auto mb-2" />
                <p className="text-text-secondary text-sm">Aucun objet trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <AnimatePresence>
                  {filteredItems.map((item, i) => {
                    const catColor = CATEGORY_COLORS[item.categories?.name] || 'text-text-secondary bg-muted'
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="card hover:border-border/80 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className={`badge ${catColor} text-[10px]`}>
                            {item.categories?.name || 'Sans catégorie'}
                          </span>
                        </div>
                        <h3 className="font-medium text-text-primary text-sm mb-1 truncate">{item.name}</h3>
                        <div className="font-display text-3xl text-text-primary tracking-wider mb-4">
                          {item.quantity}
                          <span className="text-sm text-text-muted font-body ml-1">{item.unit || 'u.'}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setWithdrawItem(item)}
                            disabled={item.quantity === 0}
                            className="flex-1 btn-secondary text-xs py-1.5 border-accent-red/20 text-accent-red hover:bg-accent-red/10 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-3 h-3" /> Retirer
                          </button>
                          <button
                            onClick={() => setAddItem(item)}
                            className="flex-1 btn-secondary text-xs py-1.5 border-accent-green/20 text-accent-green hover:bg-accent-green/10"
                          >
                            <Plus className="w-3 h-3" /> Ajouter
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {tab === 'money' && (
          <motion.div key="money" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="card">
              <h2 className="text-sm font-medium text-text-primary uppercase tracking-widest mb-4">Historique des mouvements</h2>
              {moneyLogs.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-8">Aucun mouvement enregistré</p>
              ) : (
                <div className="space-y-1">
                  {moneyLogs.map((log, i) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                        log.action === 'deposit' ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'
                      }`}>
                        {log.action === 'deposit' ? '↑' : '↓'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{log.reason || (log.action === 'deposit' ? 'Dépôt' : 'Retrait')}</p>
                        <p className="text-xs text-text-muted">{formatRelative(log.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-mono font-medium ${log.action === 'deposit' ? 'text-accent-green' : 'text-accent-red'}`}>
                          {log.action === 'deposit' ? '+' : '-'}{formatMoney(log.amount)}
                        </p>
                        <p className="text-xs text-text-muted font-mono">→ {formatMoney(log.balance_after)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AddItemModal
        open={!!addItem}
        existingItem={typeof addItem === 'object' && addItem !== true ? addItem : null}
        vaultId={id}
        categories={categories}
        onClose={() => setAddItem(false)}
        onSaved={fetchAll}
      />
      <WithdrawItemModal
        open={!!withdrawItem}
        item={withdrawItem}
        vaultId={id}
        onClose={() => setWithdrawItem(null)}
        onSaved={fetchAll}
      />
      <MoneyModal
        open={!!moneyModal}
        mode={moneyModal}
        vault={vault}
        onClose={() => setMoneyModal(null)}
        onSaved={fetchAll}
      />
    </div>
  )
}
