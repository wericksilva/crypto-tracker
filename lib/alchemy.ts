import { JsonRpcProvider, Contract } from "ethers"

export type SupportedNetwork = "ethereum" | "arbitrum"

export interface PortfolioToken {
  symbol: string
  balance: number
  network: SupportedNetwork
  contractAddress?: string
}

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]

function getRpcUrl(network: SupportedNetwork): string {
  const key = process.env.ALCHEMY_API_KEY

  if (!key) throw new Error("ALCHEMY_API_KEY não configurada")

  return network === "ethereum"
    ? `https://eth-mainnet.g.alchemy.com/v2/${key}`
    : `https://arb-mainnet.g.alchemy.com/v2/${key}`
}

async function fetchNetworkTokens(
  address: string,
  network: SupportedNetwork
): Promise<PortfolioToken[]> {
  const provider = new JsonRpcProvider(getRpcUrl(network))

  const nativeBalance = await provider.getBalance(address)

  const tokens: PortfolioToken[] = []

  // Nativo (ETH)
  if (nativeBalance > BigInt(0)) {
    tokens.push({
      symbol: "ETH",
      balance: Number(nativeBalance) / 10 ** 18,
      network,
    })
  }

  // ERC20
  const response = await provider.send("alchemy_getTokenBalances", [
    address,
    "erc20",
  ])

  for (const token of response.tokenBalances) {
    if (token.tokenBalance === "0x0") continue

    try {
      const contract = new Contract(
        token.contractAddress,
        ERC20_ABI,
        provider
      )

      const decimals = await contract.decimals()
      const symbol = await contract.symbol()

      const raw = BigInt(token.tokenBalance)

      const balance = Number(raw) / 10 ** decimals

      if (balance > 0) {
        tokens.push({
          symbol,
          balance,
          network,
          contractAddress: token.contractAddress,
        })
      }
    } catch {
      continue
    }
  }

  return tokens
}

export async function getWalletPortfolio(address: string) {
  const [ethTokens, arbTokens] = await Promise.all([
    fetchNetworkTokens(address, "ethereum"),
    fetchNetworkTokens(address, "arbitrum"),
  ])

  return [...ethTokens, ...arbTokens]
}