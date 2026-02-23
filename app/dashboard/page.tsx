"use client"

import { useState, useEffect, ReactNode } from "react"
import WalletForm from "@/components/WalletForm"
import { useRouter } from "next/navigation" // import do useRouter
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  TooltipProps,
} from "recharts"
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"

type Transaction = {
  amount: number
  price: number
  timestamp: number
}

type Token = {
  contractAddress: string
  symbol: string
  network: "ethereum" | "arbitrum"
  balance: number
  price: number
  value: number
  transactions?: Transaction[]
}

type HistoricalPrice = {
  timestamp: number
  price: number
}

type TokenWithHistory = Token & {
  history?: HistoricalPrice[]
  avgPrice?: number
}

type PeriodOption = "24h" | "7d" | "1m" | "3m" | "6m" | "1y" | "all"

type ChartEntry = {
  date: string
  total: number
  [tokenSymbol: string]: number | string
}

export default function DashboardPage() {
  const [tokens, setTokens] = useState<TokenWithHistory[]>([])
  const [totalValue, setTotalValue] = useState<number>(0)
  const [performance, setPerformance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [chartPeriod, setChartPeriod] = useState<PeriodOption>("7d")
  const [chartData, setChartData] = useState<ChartEntry[]>([])
  const router = useRouter()
  
  const periods: PeriodOption[] = ["24h", "7d", "1m", "3m", "6m", "1y", "all"]

  const abbreviateNetwork = (network: string) => {
    switch (network.toLowerCase()) {
      case "ethereum": return "ETH"
      case "arbitrum": return "ARB"
      default: return network.toUpperCase()
    }
  }

  async function fetchHistoricalPrices(symbol: string, period: PeriodOption): Promise<HistoricalPrice[]> {
    const now = Date.now()
    const points: number = period === "24h" ? 24 :
                           period === "7d" ? 7 :
                           period === "1m" ? 30 :
                           period === "3m" ? 90 :
                           period === "6m" ? 180 :
                           period === "1y" ? 365 : 1825
    const data: HistoricalPrice[] = []
    for (let i = points; i >= 0; i--) {
      data.push({
        timestamp: now - i * 24 * 60 * 60 * 1000,
        price: Math.random() * 100
      })
    }
    return data
  }

  function calculateAvgPrice(transactions?: Transaction[]): number {
    if (!transactions || transactions.length === 0) return 0
    const totalPaid = transactions.reduce((sum, t) => sum + t.amount * t.price, 0)
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
    return totalAmount > 0 ? totalPaid / totalAmount : 0
  }

  async function handleSubmit(address: string) {
    try {
      setLoading(true)
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      })
      const data = await res.json()
      const tokensData: TokenWithHistory[] = data.tokens || []

      for (const token of tokensData) {
        token.history = await fetchHistoricalPrices(token.symbol, chartPeriod)
        token.transactions = [
          { amount: token.balance * 0.5, price: token.price * 0.8, timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000 },
          { amount: token.balance * 0.5, price: token.price * 1.2, timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000 },
        ]
        token.avgPrice = calculateAvgPrice(token.transactions)
      }

      setTokens(tokensData)
      setTotalValue(tokensData.reduce((sum, t) => sum + (t.value || 0), 0))
      updateChart(tokensData, chartPeriod)
    } catch (error) {
      console.error(error)
      setTokens([])
      setChartData([])
      setTotalValue(0)
      setPerformance(null)
    } finally {
      setLoading(false)
    }
  }

  function aggregateMonthly(data: ChartEntry[]): ChartEntry[] {
    const monthlyMap = new Map<string, { total: number; count: number }>()
    data.forEach(item => {
      const d = new Date(item.date.split("/").reverse().join("-"))
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`
      if (!monthlyMap.has(key)) monthlyMap.set(key, { total: 0, count: 0 })
      const entry = monthlyMap.get(key)!
      entry.total += item.total as number
      entry.count += 1
    })
    return Array.from(monthlyMap.entries()).map(([k, v]) => {
      const [year, month] = k.split("-")
      return { date: `${month}/${year}`, total: v.total / v.count }
    })
  }

  function updateChart(tokensData: TokenWithHistory[], period: PeriodOption) {
    if (!tokensData.length) return
    const firstHistory = tokensData[0]?.history
    if (!firstHistory) return
    const dates = firstHistory.map(h => new Date(h.timestamp).toLocaleDateString("pt-BR"))

    const data: ChartEntry[] = dates.map((date, idx) => {
      const entry: ChartEntry = { date, total: 0 }
      let total = 0
      for (const token of tokensData) {
        const price = token.history?.[idx]?.price ?? 0
        const value = token.balance * price
        total += value
        entry[token.symbol] = value
      }
      entry.total = total
      return entry
    })

    const finalData: ChartEntry[] = period === "all"
      ? aggregateMonthly(data).map((d, i) => {
          const entry: ChartEntry = { date: d.date, total: d.total }
          tokensData.forEach(token => {
            entry[token.symbol] = (token.history?.[i]?.price ?? 0) * token.balance
          })
          return entry
        })
      : data

    setChartData(finalData)

    const startValue = finalData[0]?.total ?? 0
    const endValue = finalData[finalData.length - 1]?.total ?? 0
    setPerformance(startValue > 0 ? ((endValue - startValue) / startValue) * 100 : null)
    setTotalValue(tokensData.reduce((sum, t) => sum + (t.value || 0), 0))
  }

  useEffect(() => {
    if (!tokens.length) return
    const updateHistory = async () => {
      for (const token of tokens) {
        token.history = await fetchHistoricalPrices(token.symbol, chartPeriod)
      }
      updateChart(tokens, chartPeriod)
    }
    updateHistory()
  }, [chartPeriod])

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-6">
  <h1 className="text-2xl sm:text-3xl font-bold text-center">Portfolio Dashboard</h1>
  <div className="flex gap-2">
    {/* Botão Dashboard */}
    <button
      onClick={() => router.push("/dashboard")}
      className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded text-white font-semibold transition"
    >
      Dashboard
    </button>

    {/* Botão Mercado */}
    <button
      onClick={() => router.push("/mercado")}
      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-white font-semibold transition"
    >
      Mercado
    </button>
  </div>
</div>

        <WalletForm onSubmit={handleSubmit} />

        {/* TOTAL + DESEMPENHO */}
        <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-800 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Valor Total</p>
            <h2 className="text-3xl sm:text-4xl font-bold mt-1 sm:mt-2 text-green-400">
              ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </h2>
          </div>
          {performance !== null && (
            <div className="text-center">
              <p className={`text-sm ${performance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                Desempenho ({chartPeriod}): {performance < 0 ? '-' : '+'}{Math.abs(performance).toFixed(2)}%
              </p>
            </div>
          )}
        </div>

        {loading && <div className="text-center text-gray-400">Carregando carteira...</div>}

        {/* GRÁFICO */}
        {chartData.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
              <h3 className="text-lg font-semibold">Distribuição por Token</h3>
              <select
                value={chartPeriod}
                onChange={(e) => setChartPeriod(e.target.value as PeriodOption)}
                className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-1 text-sm"
              >
                {periods.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#aaa" />
                  <YAxis stroke="#aaa" />
                 <Tooltip
                      formatter={(value) => {
                        const num = typeof value === "number" ? value : 0
                        return `$${num.toFixed(2)}`
                      }}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                  <Line type="monotone" dataKey="total" stroke="#4ade80" strokeWidth={3} dot={false} />
                  {tokens.map(token => (
                    <Line
                      key={token.symbol}
                      type="monotone"
                      dataKey={token.symbol}
                      strokeOpacity={0.5}
                      stroke={`#${Math.floor(Math.random()*16777215).toString(16)}`} 
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TABELA */}
        {tokens.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-800 overflow-x-auto">
            <h3 className="text-lg font-semibold mb-2 sm:mb-4">Tokens</h3>
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700 text-sm">
                  <th className="pb-2 sm:pb-3 px-2 sm:px-4">Token / Rede</th>
                  <th className="pb-2 sm:pb-3 px-2 sm:px-4 text-right">Saldo</th>
                  <th className="pb-2 sm:pb-3 px-2 sm:px-4 text-right">Preço Médio (USD)</th>
                  <th className="pb-2 sm:pb-3 px-2 sm:px-4 text-right">Valor (USD)</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={`${token.contractAddress}-${token.network}`} className="border-b border-gray-800 hover:bg-gray-800 transition">
                    <td className="py-2 sm:py-4 px-2 sm:px-4 font-semibold">
                      {token.symbol} / {abbreviateNetwork(token.network)}
                    </td>
                    <td className="py-2 sm:py-4 px-2 sm:px-4 text-right">{token.balance.toFixed(4)}</td>
                    <td className="py-2 sm:py-4 px-2 sm:px-4 text-right text-yellow-400">${token.avgPrice?.toFixed(2)}</td>
                    <td className="py-2 sm:py-4 px-2 sm:px-4 text-right font-semibold text-green-400">${token.value.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tokens.length === 0 && (
          <div className="text-center text-gray-500 mt-6 sm:mt-10">Nenhum token encontrado</div>
        )}
      </div>
    </div>
  )
}