"use client"

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts"

interface Token {
  symbol: string
  value: number
}

interface Props {
  tokens: Token[]
}

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#0088fe",
  "#00c49f",
]

export default function PortfolioChart({ tokens }: Props) {
  const data = tokens.map((t) => ({
    name: t.symbol,
    value: t.value,
  }))

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            outerRadius={100}
            label
          >
            {data.map((_, idx) => (
              <Cell
                key={idx}
                fill={COLORS[idx % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}