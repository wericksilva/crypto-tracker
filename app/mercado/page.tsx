"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Coin = {
  id: string
  name: string
  symbol: string
  image: string
  current_price: number
  price_change_percentage_24h: number
  market_cap: number
}

export default function MercadoPage() {
  const [coins, setCoins] = useState<Coin[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadCoins() {
      try {
        const res = await fetch("/api/market")

        const data = await res.json()
        setCoins(data)
      } catch (error) {
        console.error("Erro ao buscar mercado:", error)
      } finally {
        setLoading(false)
      }
    }

    loadCoins()
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">

        {/* HEADER + BOTÕES */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">
            Mercado Cripto
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded text-white font-semibold transition"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push("/mercado")}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-white font-semibold transition"
            >
              Mercado
            </button>
          </div>
        </div>

        {/* TABELA */}
        <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-800 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-sm">
                <th className="p-4">Moeda</th>
                <th className="p-4">Preço</th>
                <th className="p-4">24h</th>
                <th className="p-4">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-400">
                    Carregando mercado...
                  </td>
                </tr>
              )}

              {!loading &&
                coins.map((coin) => (
                  <tr
                    key={coin.id}
                    className="border-b border-gray-800 hover:bg-gray-800 transition"
                  >
                    {/* MOEDA + ÍCONE */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={coin.image}
                          alt={coin.name}
                          className="w-6 h-6"
                        />
                        <div>
                          <div className="font-semibold">{coin.name}</div>
                          <div className="text-gray-400 text-sm">
                            {coin.symbol.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* PREÇO */}
                    <td className="p-4 font-medium text-green-400">
                      $
                      {coin.current_price?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      }) ?? "0.00"}
                    </td>

                    {/* 24H */}
                    <td
                      className={`p-4 font-semibold ${
                        (coin.price_change_percentage_24h ?? 0) >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
                    </td>

                    {/* MARKET CAP */}
                    <td className="p-4 text-gray-400">
                      $
                      {coin.market_cap?.toLocaleString("en-US") ?? "0"}
                    </td>
                  </tr>
                ))}

              {!loading && coins.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-500">
                    Nenhum dado encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}