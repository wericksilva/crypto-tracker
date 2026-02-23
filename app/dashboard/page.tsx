"use client"

import { useState } from "react"
import WalletForm from "@/components/WalletForm"
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

export default function DashboardPage() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [totalValue, setTotalValue] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(address: string) {
    try {
      setLoading(true)

      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      })

      const data = await res.json()

      const tokensData = data.tokens ?? []

setTokens(tokensData)

const total = tokensData.reduce(
  (sum: number, t: Token) => sum + (t.value || 0),
  0
)

setTotalValue(total)
    } catch (error) {
      console.error(error)
      setTokens([])
      setTotalValue(0)
    } finally {
      setLoading(false)
    }
  }

  const chartData =
    tokens?.map((token) => ({
      name: token.symbol,
      value: token.value,
    })) ?? []

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">

        <h1 className="text-3xl font-bold text-center">
          Portfolio Dashboard
        </h1>

        <WalletForm onSubmit={handleSubmit} />

        {/* TOTAL */}
        <div className="bg-gray-900 rounded-2xl p-6 shadow-lg border border-gray-800 text-center">
          <p className="text-gray-400 text-sm">Valor Total</p>
          <h2 className="text-4xl font-bold mt-2 text-green-400">
            ${Number(totalValue).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>

        {loading && (
          <div className="text-center text-gray-400">
            Carregando carteira...
          </div>
        )}

        {/* GRÁFICO */}
        {chartData.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-6 shadow-lg border border-gray-800">
            <h3 className="text-lg font-semibold mb-4">
              Distribuição por Token
            </h3>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#aaa" />
                  <YAxis stroke="#aaa" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#4ade80"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TABELA */}
        {tokens.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-6 shadow-lg border border-gray-800 overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4">
              Tokens
            </h3>

            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700 text-sm">
                  <th className="pb-3">Token</th>
                  <th className="pb-3">Rede</th>
                  <th className="pb-3 text-right">Saldo</th>
                  <th className="pb-3 text-right">Valor (USD)</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr
                    key={`${token.contractAddress}-${token.network}`}
                    className="border-b border-gray-800 hover:bg-gray-800 transition"
                  >
                    <td className="py-4 font-semibold">
                      {token.symbol}
                    </td>

                    <td className="py-4 capitalize text-gray-400">
                      {token.network}
                    </td>

                    <td className="py-4 text-right">
                      {token.balance.toFixed(4)}
                    </td>

                    <td className="py-4 text-right font-semibold text-green-400">
                      ${token.value.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tokens.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            Nenhum token encontrado
          </div>
        )}
      </div>
    </div>
  )
}