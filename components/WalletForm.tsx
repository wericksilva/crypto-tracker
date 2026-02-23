"use client"

import { useState } from "react"

interface WalletFormProps {
  onSubmit: (address: string) => Promise<void> | void
}

export default function WalletForm({ onSubmit }: WalletFormProps) {
  const [address, setAddress] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("wallet") || ""
    }
    return ""
  })

  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!address.trim()) {
      alert("Digite um endereço válido")
      return
    }

    try {
      setLoading(true)

      localStorage.setItem("wallet", address)

      await onSubmit(address)

    } catch (error) {
      console.error("Erro no submit:", error)
      alert("Erro ao analisar carteira")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl mx-auto flex flex-col md:flex-row gap-4"
    >
      <input
        type="text"
        placeholder="Digite sua carteira 0x..."
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="flex-1 border rounded-lg px-4 py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition disabled:opacity-50"
      >
        {loading ? "Carregando..." : "Analisar carteira"}
      </button>
    </form>
  )
}