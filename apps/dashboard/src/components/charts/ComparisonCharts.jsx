import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { ResponsiveRadar } from '@nivo/radar';
import { formatCurrency } from '../../lib/utils';

const MEMBER_COLORS = ['#3b82f6', '#ff8c42', '#22c55e', '#a855f7'];

export function MemberBarChart({ members = [] }) {
  const data = members.map((m) => ({
    name: m.display_name,
    total: m.total,
  }));

  return (
    <div className="card chart-card p-4">
      <h3 className="mb-4 text-sm font-semibold">Member Spending</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(v) => formatCurrency(v)} />
          <Bar dataKey="total" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={MEMBER_COLORS[i % MEMBER_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MemberPieChart({ members = [] }) {
  return (
    <div className="card chart-card p-4">
      <h3 className="mb-4 text-sm font-semibold">Family Share</h3>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={members}
            dataKey="total"
            nameKey="display_name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            label={({ display_name, percentage_of_family }) =>
              `${display_name} ${percentage_of_family?.toFixed(0)}%`
            }
          >
            {members.map((_, i) => (
              <Cell key={i} fill={MEMBER_COLORS[i % MEMBER_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatCurrency(v)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MemberRadarChart({ members = [] }) {
  const categories = [
    ...new Set(members.flatMap((m) => Object.keys(m.categories || {}))),
  ].slice(0, 6);

  const radarData = categories.map((cat) => {
    const row = { category: cat };
    members.forEach((m) => {
      row[m.display_name] = m.categories?.[cat] || 0;
    });
    return row;
  });

  const keys = members.map((m) => m.display_name);

  return (
    <div className="card chart-card-tall p-4">
      <h3 className="mb-4 text-sm font-semibold">Category Radar by Member</h3>
      <div className="h-full min-h-[14rem]">
        <ResponsiveRadar
          data={radarData}
          keys={keys}
          indexBy="category"
          maxValue="auto"
          margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
          curve="linearClosed"
          borderWidth={2}
          borderColor={{ from: 'color' }}
          gridLevels={5}
          gridShape="circular"
          gridLabelOffset={12}
          enableDots
          dotSize={8}
          dotColor={{ theme: 'background' }}
          dotBorderWidth={2}
          colors={MEMBER_COLORS}
          fillOpacity={0.15}
          blendMode="multiply"
          animate
          theme={{
            text: { fill: '#8892a4', fontSize: 11 },
            grid: { line: { stroke: 'rgba(255,255,255,0.08)' } },
          }}
        />
      </div>
    </div>
  );
}

export function MemberTrendChart({ trendByMember = {} }) {
  const months = Object.keys(trendByMember[Object.keys(trendByMember)[0]] || {});
  const data = months.map((month) => {
    const row = { month };
    Object.entries(trendByMember).forEach(([name, values]) => {
      row[name] = values[month] || 0;
    });
    return row;
  });

  const names = Object.keys(trendByMember);

  return (
    <div className="card chart-card p-4">
      <h3 className="mb-4 text-sm font-semibold">Member Monthly Trends</h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(v) => formatCurrency(v)} />
          <Legend />
          {names.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={MEMBER_COLORS[i % MEMBER_COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
