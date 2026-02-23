import { Token, PortfolioResult, TokenWithPrice } from "@/types/portfolio"

interface PriceResponse {
  [key: string]: {
    usd: number
  }
}

export function calculatePortfolio(
  tokens: Token[],
  prices: PriceResponse
): PortfolioResult {

  let total = 0

  const enriched: TokenWithPrice[] = tokens.map((token) => {
    const price = prices[token.id]?.usd || 0
    const value = token.balance * price

    total += value

    return {
      ...token,
      price,
      value,
    }
  })

  return { total, tokens: enriched }
}