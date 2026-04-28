'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface SeriesPoint {
  month: string
  count: number
}

export function GrowthLineChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="currentColor" className="text-zinc-500" />
        <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-zinc-500" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: 'var(--tooltip-bg, #ffffff)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#E94560"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#E94560' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function SignupsBarChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="currentColor" className="text-zinc-500" />
        <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-zinc-500" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: 'var(--tooltip-bg, #ffffff)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" fill="#1A1A2E" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
