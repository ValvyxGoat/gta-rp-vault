import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DollarSign, Package, Vault, TrendingUp, TrendingDown, ArrowRight, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatMoney, formatRelative } from '../lib/utils'

function StatCard({ label, value, icon: Icon, color, sub, delay = 0 }) {
  const colorMap = {
    gold: { bg: 'bg-accent-gold/10', text: 'text-accent-gold', border: 'border-accent-gold/20', glow: 'glow-border-gold' },
    green: { bg: 'bg-accent-green/10', text: 'text-accent-green', border: 'border-accent-green/20', glow: 'glow-border-green' },
    red: { bg: 'bg-accent-red/10', text: 'text-accent-red', border: 'border-accent-red/20', glow: 'glow-border-red' },
    orange: { bg: 'bg-accent-orange/10', text: 'text-accent-orange', border: 'border-accent-orange/20', glow: '' },
  }
  const c = colorMap[color] || colorMap.red

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`stat-card border ${c.border} ${c.glow}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${c.text}`} />
        </div>
        <span className="text-[10px] text-text-muted uppercase tracking-widest">{label}</span>
      </div>
      <div className={`font-display text-3xl tracking-wider ${c.text} mb-0.5`}>{value}</div>
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
    </motion.div>
  )
}

function LogBadge({ action }) {
  if (action === 'add') return <span className="badge bg-accent-green/10 text-accent-green">＋ Ajout</span>
  if (action === 'remove') return <span className="badge bg-accent-red/10 text-accent-red">— Retrait</span>
  if (action === 'deposit') return <span className="badge bg-accent-gold/10 text-accent-gold">💰 Dépôt</span>
  if (action === 'withdraw') return <span className="badge bg-accent-orange/10 text-accent-orange">💸 Retrait $</span>
  return <span className="badge bg-muted text-text-secondary">{action}</span>
}

export default function Dashboard() {
  const [stats, setStats] = useState({ totalMoney: 0, totalItems: 0, vaultCount: 0 })
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { data: vaults },
        { data: items },
        { data: iLogs },
        { data: mLogs },
      ] = await Promise.all([
        supabase.from('vaults').select('id, money'),
        supabase.from('items').select('quantity'),
        supabase.from('item_logs').select('*, vaults(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('money_logs').select('*, vaults(name)').order('created_at', { ascending: false }).limit(5),
      ])

      const totalMoney = (vaults || []).reduce((s, v) => s + (v.money || 0), 0)
      const totalItems = (items || []).reduce((s, i) => s + (i.quantity || 0), 0)

      // Fusionner et trier les logs récents
      const combined = [
        ...(iLogs || []).map(l => ({ ...l, type: 'item' })),
        ...(mLogs || []).map(l => ({ ...l, type: 'money', item_name: l.action === 'deposit' ? 'Dépôt' : 'Retrait', quantity: l.amount })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8)

      setStats({ totalMoney, totalItems, vaultCount: (vaults || []).length })
      setRecentLogs(combined)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-display text-4xl tracking-widest text-text-primary">TABLEAU DE BORD</h1>
        <p className="text-text-secondary text-sm mt-1">Vue globale des opérations</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            label="Argent Total"
            value={loading ? '—' : formatMoney(stats.totalMoney)}
            icon={DollarSign}
            color="gold"
            sub="Tous coffres confondus"
            delay={0}
          />
        </div>
        <StatCard
          label="Objets Stockés"
          value={loading ? '—' : stats.totalItems.toLocaleString()}
          icon={Package}
          color="green"
          sub="Quantité totale"
          delay={0.05}
        />
        <StatCard
          label="Coffres"
          value={loading ? '—' : stats.vaultCount}
          icon={Vault}
          color="red"
          sub="Actifs"
          delay={0.1}
        />
        <StatCard
          label="Activité"
          value={loading ? '—' : recentLogs.length}
          icon={Clock}
          color="orange"
          sub="Actions récentes"
          delay={0.15}
        />
      </div>

      {/* Recent activity */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-text-primary uppercase tracking-widest">Dernières actions</h2>
          <Link to="/logs" className="text-xs text-accent-red hover:text-red-400 flex items-center gap-1 transition-colors">
            Tout voir <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recentLogs.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">Aucune action enregistrée</p>
        ) : (
          <div className="space-y-1">
            {recentLogs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.04 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <LogBadge action={log.action} />
                <span className="text-sm text-text-primary flex-1 truncate">{log.item_name}</span>
                <span className="text-xs text-text-secondary font-mono">
                  {log.type === 'money' ? formatMoney(log.quantity) : `×${log.quantity}`}
                </span>
                <span className="text-xs text-text-muted hidden sm:block">{formatRelative(log.created_at)}</span>
                {log.vaults && (
                  <span className="text-[10px] text-text-muted bg-muted px-1.5 py-0.5 rounded hidden md:block">
                    {log.vaults.name}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
