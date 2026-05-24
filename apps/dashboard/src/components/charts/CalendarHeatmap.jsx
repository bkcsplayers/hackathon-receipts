import { ResponsiveCalendar } from '@nivo/calendar';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../lib/utils';

export function CalendarHeatmap({ data = [], year = new Date().getFullYear(), onDayClick }) {
  const calendarData = data.map((d) => ({
    day: d.date,
    value: d.total || 0,
  }));

  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="card overflow-hidden p-4"
    >
      <h3 className="mb-4 text-sm font-semibold">Daily Spending — {year}</h3>
      <div className="h-48 md:h-56">
        <ResponsiveCalendar
          data={calendarData}
          from={from}
          to={to}
          emptyColor="#1a2332"
          colors={['#1e3a5f', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd']}
          margin={{ top: 10, right: 10, bottom: 10, left: 20 }}
          yearSpacing={40}
          monthBorderColor="var(--border)"
          dayBorderWidth={2}
          dayBorderColor="var(--bg-primary)"
          onClick={(day) => onDayClick?.(day)}
          tooltip={({ day, value, color }) => (
            <div
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs shadow-lg"
              style={{ background: color }}
            >
              <strong>{day}</strong>
              <br />
              {formatCurrency(value || 0)}
            </div>
          )}
        />
      </div>
    </motion.div>
  );
}
