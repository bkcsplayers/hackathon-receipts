import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { formatCurrency, getCategoryColor } from '../../lib/utils';

export function CategoryDonutChart({ data = [], onCategoryClick }) {
  const total = data.reduce((s, d) => s + (d.total || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="card p-4"
    >
      <h3 className="mb-4 text-sm font-semibold">Category Breakdown</h3>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative h-56 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="85%"
                paddingAngle={2}
                onClick={(_, index) => onCategoryClick?.(data[index]?.category)}
                style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
              >
                {data.map((entry) => (
                  <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
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
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-[var(--text-secondary)]">Total</span>
            <span className="text-lg font-bold text-[var(--accent-gold)]">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        <ul className="flex flex-1 flex-col gap-2 text-sm">
          {data.map((item) => (
            <li
              key={item.category}
              className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-[var(--bg-card)]"
              onClick={() => onCategoryClick?.(item.category)}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: getCategoryColor(item.category) }}
              />
              <span className="flex-1">
                {item.icon} {item.category}
              </span>
              <span className="text-[var(--text-secondary)]">{item.percentage?.toFixed(1)}%</span>
              <span className="font-medium text-[var(--accent-gold)]">
                {formatCurrency(item.total)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
