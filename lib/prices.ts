const COINGECKO_API = "https://api.coingecko.com/api/v3"

export interface PriceResponse {
  [contract: string]: {
    usd: number
  }
}

export interface PriceInput {
  contractAddress: string
  network: "ethereum" | "arbitrum"
}

export async function getTokenPrices(
  tokens: PriceInput[]
): Promise<PriceResponse> {
  const results: PriceResponse = {}

  for (const token of tokens) {
    const platform =
      token.network === "ethereum" ? "ethereum" : "arbitrum-one"

    const url = `${COINGECKO_API}/simple/token_price/${platform}?contract_addresses=${token.contractAddress}&vs_currencies=usd`

    const response = await fetch(url)

    if (!response.ok) {
      const text = await response.text()
      console.error("CoinGecko error:", text)
      continue
    }

    const data = await response.json()

    if (data[token.contractAddress.toLowerCase()]) {
      results[token.contractAddress.toLowerCase()] =
        data[token.contractAddress.toLowerCase()]
    }

    // evitar rate limit
    await new Promise((resolve) => setTimeout(resolve, 1200))
  }

  return results
}