import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../lib/utils';

const GOLD_GRADIENT = ['#fbbf24', '#ff8c42'];

export function MerchantsBarChart({ data = [], onMerchantClick }) {
  const sorted = [...data].sort((a, b) => a.total - b.total);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.35 }}
      className="card chart-card-tall p-4"
    >
      <h3 className="mb-4 text-sm font-semibold">Top Merchants</h3>
      {sorted.length === 0 ? (
        <div className="flex h-[85%] items-center justify-center text-sm text-[var(--text-secondary)]">
          No merchants in this period. Switch to &quot;All Time&quot; in the filter above.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="90%">
        <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="store_name"
            width={100}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}
            formatter={(value) => formatCurrency(value)}
          />
          <Bar
            dataKey="total"
            radius={[0, 6, 6, 0]}
            cursor="pointer"
            onClick={(d) => onMerchantClick?.(d.store_name)}
          >
            {sorted.map((_, i) => (
              <Cell key={i} fill={i % 2 === 0 ? GOLD_GRADIENT[0] : GOLD_GRADIENT[1]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      )}
    </motion.div>
  );
}
