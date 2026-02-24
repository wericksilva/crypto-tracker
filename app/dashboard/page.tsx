"use client"

import { useState, useEffect } from "react"
import WalletForm from "@/components/WalletForm"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

type Token = {
  contractAddress: string
  symbol: string
  network: "ethereum" | "arbitrum"
  balance: number
  price: number
  value: number
}

type HistoricalPrice = {
  timestamp: number
  price: number
}

type TokenWithHistory = Token & {
  history?: HistoricalPrice[] // histórico de preços
}

type PeriodOption = "24h" | "7d" | "1m" | "3m" | "6m" | "1y" | "all"

export default function DashboardPage() {
  const [tokens, setTokens] = useState<TokenWithHistory[]>([])
  const [totalValue, setTotalValue] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [chartPeriod, setChartPeriod] = useState<PeriodOption>("7d")
  const [chartData, setChartData] = useState<{ date: string; value: number }[]>([])
  const router = useRouter()
  const periods: PeriodOption[] = ["24h", "7d", "1m", "3m", "6m", "1y", "all"]

  // Abrevia a rede para economizar espaço
  const abbreviateNetwork = (network: string) => {
    switch (network.toLowerCase()) {
      case "ethereum": return "ETH"
      case "arbitrum": return "ARB"
      default: return network.toUpperCase()
    }
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
      const tokensData: TokenWithHistory[] = data.tokens ?? []

      // Exemplo: carregar histórico de preços para cada token
      // Aqui você pode chamar API de Coingecko ou sua própria API
      for (const token of tokensData) {
        token.history = await fetchHistoricalPrices(token.symbol, chartPeriod)
      }

      setTokens(tokensData)
      setTotalValue(tokensData.reduce((sum, t) => sum + (t.value || 0), 0))
    } catch (error) {
      console.error(error)
      setTokens([])
      setTotalValue(0)
    } finally {
      setLoading(false)
    }
  }

  // Simula fetch de histórico (substitua por API real)
  async function fetchHistoricalPrices(symbol: string, period: PeriodOption): Promise<HistoricalPrice[]> {
    const now = Date.now()
    const data: HistoricalPrice[] = []

    const points = period === "24h" ? 24 :
                   period === "7d" ? 7 :
                   period === "1m" ? 30 :
                   period === "3m" ? 90 :
                   period === "6m" ? 180 :
                   period === "1y" ? 365 : 30

    for (let i = points; i >= 0; i--) {
      data.push({
        timestamp: now - i * 24 * 60 * 60 * 1000,
        price: Math.random() * 100, // simulação
      })
    }
    return data
  }

  // Calcula valor da carteira ao longo do período
  useEffect(() => {
    if (!tokens.length) return

    const dates = tokens[0]?.history?.map(h => new Date(h.timestamp).toLocaleDateString()) ?? []
    const data = dates.map((date, idx) => {
      let total = 0
      for (const token of tokens) {
        const price = token.history?.[idx]?.price ?? 0
        total += token.balance * price
      }
      return { date, value: total }
    })
    setChartData(data)
  }, [tokens, chartPeriod])

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">

        <div className="flex gap-2">
            <Link href="/mercado">
              <span className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-white font-semibold transition cursor-pointer">
                Mercado
              </span>
            </Link>
          </div>


        <WalletForm onSubmit={handleSubmit} />

        {/* TOTAL */}
        <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-800 text-center">
          <p className="text-gray-400 text-sm">Valor Total</p>
          <h2 className="text-3xl sm:text-4xl font-bold mt-1 sm:mt-2 text-green-400">
            ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </h2>
        </div>

        {loading && (
          <div className="text-center text-gray-400">Carregando carteira...</div>
        )}

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
                    formatter={(value?: number) => (value !== undefined ? `$${value.toFixed(2)}` : "-")}
                  />
                  <Line type="monotone" dataKey="value" stroke="#4ade80" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TABELA COMPACTA */}
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
                  <tr
                    key={`${token.contractAddress}-${token.network}`}
                    className="border-b border-gray-800 hover:bg-gray-800 transition"
                  >
                    <td className="py-2 sm:py-4 px-2 sm:px-4 font-semibold">
                      {token.symbol} / {abbreviateNetwork(token.network)}
                    </td>
                    <td className="py-2 sm:py-4 px-2 sm:px-4 text-right">{token.balance.toFixed(4)}</td>
                    <td className="py-2 sm:py-4 px-2 sm:px-4 text-right text-yellow-400">${token.price.toFixed(2)}</td>
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