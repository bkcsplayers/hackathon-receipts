import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../lib/utils';

const METHOD_COLORS = {
  CREDIT_CARD: '#3b82f6',
  DEBIT_CARD: '#22c55e',
  CASH: '#fbbf24',
  OTHER: '#8892a4',
};

export function PaymentMethodsChart({ data = [] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="card chart-card p-4"
    >
      <h3 className="mb-4 text-sm font-semibold">Payment Methods</h3>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ label, percentage }) => `${label} ${percentage}%`}
            labelLine={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.method}
                fill={METHOD_COLORS[entry.method] || METHOD_COLORS.OTHER}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}
            formatter={(value) => formatCurrency(value)}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
