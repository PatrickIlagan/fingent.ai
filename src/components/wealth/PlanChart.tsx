import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Bucket, Row } from '../../lib/wealthPlan';

const short = (value: number) => { const a = Math.abs(value); return a >= 1e6 ? `₱${(value / 1e6).toFixed(1)}M` : a >= 1e3 ? `₱${Math.round(value / 1e3)}k` : `₱${Math.round(value)}`; };
const peso = (value: number) => '₱' + Math.round(value).toLocaleString('en-PH');

export type ChartShow = { buckets: boolean; band: boolean; actual: boolean; deposits: boolean; whatIf: boolean };

/**
 * The plan over time: stacked buckets (or the total), the Conservative–Aggressive
 * range, what you've actually got, money put in, and any what-if.
 */
export function PlanChart({ rows, low, high, whatIf, actual, buckets, show, advanced, height = 280, deflate }: {
  rows: Row[]; low: Row[]; high: Row[]; whatIf?: Row[] | null; actual: { index: number; total: number }[]; buckets: Bucket[];
  show: ChartShow; advanced: boolean; height?: number; deflate?: (amount: number, index: number) => number;
}) {
  const adjust = (amount: number, index: number) => deflate ? deflate(amount, index) : amount;
  const data = rows.map((row, at) => {
    const point: Record<string, number | string | number[] | null> = { label: row.label, total: adjust(row.total, row.index), deposits: adjust(row.principalTotal, row.index), band: [adjust(low[at]?.total ?? row.total, row.index), adjust(high[at]?.total ?? row.total, row.index)] };
    for (const bucket of buckets) point[bucket.id] = adjust(row.balances[bucket.id] ?? 0, row.index);
    point.whatIf = whatIf ? adjust(whatIf[at]?.total ?? 0, row.index) : null;
    point.actual = actual.find(item => item.index === row.index) ? adjust(actual.find(item => item.index === row.index)!.total, row.index) : null;
    return point;
  });
  const grid = advanced ? '#334155' : '#e2e8f0';
  const tick = { fill: advanced ? '#94a3b8' : '#64748b', fontSize: 10 };
  return <div style={{ height }} className="w-full">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="plan-band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity="0.22" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0.05" /></linearGradient>
          {buckets.map(bucket => <linearGradient key={bucket.id} id={`fill-${bucket.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={bucket.color} stopOpacity="0.55" /><stop offset="1" stopColor={bucket.color} stopOpacity="0.15" /></linearGradient>)}
        </defs>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
        <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={short} width={48} />
        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(15,23,42,0.15)', fontSize: 12, background: advanced ? '#1e293b' : '#fff', color: advanced ? '#e2e8f0' : '#0f172a' }}
          formatter={(value: unknown, name: unknown) => { const label = String(name); const display = Array.isArray(value) ? `${peso(Number(value[0]))} – ${peso(Number(value[1]))}` : peso(Number(value)); return [display, label === 'band' ? 'Range' : label === 'total' ? 'Plan' : label === 'actual' ? 'Actual' : label === 'deposits' ? 'Put in' : label === 'whatIf' ? 'What-if' : buckets.find(bucket => bucket.id === label)?.name ?? label]; }} />
        {show.band && <Area dataKey="band" stroke="none" fill="url(#plan-band)" isAnimationActive={false} />}
        {show.buckets
          ? buckets.map(bucket => <Area key={bucket.id} type="monotone" dataKey={bucket.id} stackId="buckets" stroke={bucket.color} strokeWidth={1.5} fill={`url(#fill-${bucket.id})`} />)
          : <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />}
        {show.deposits && <Line type="monotone" dataKey="deposits" stroke={advanced ? '#94a3b8' : '#64748b'} strokeWidth={1.5} strokeDasharray="2 4" dot={false} />}
        {show.whatIf && whatIf && <Line type="monotone" dataKey="whatIf" stroke="#e11d48" strokeWidth={2} strokeDasharray="6 4" dot={false} />}
        {show.actual && <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} dot={{ r: 2.5 }} connectNulls={false} />}
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}
