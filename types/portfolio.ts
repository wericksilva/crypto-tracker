export interface RawTokenBalance {
  contractAddress: string
  tokenBalance: string
}

export interface Token {
  id: string              // id usado no CoinGecko
  symbol: string
  name: string
  balance: number
}

export interface TokenWithPrice extends Token {
  price: number
  value: number
}

export interface PortfolioResult {
  total: number
  tokens: TokenWithPrice[]
}