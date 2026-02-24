import { NextResponse } from "next/server"

export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false",
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 60 }, // cache 60s (importantíssimo)
      }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: "Erro ao buscar mercado" },
        { status: 500 }
      )
    }

    const data = await res.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error("Erro API Market:", error)

    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}