import { NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"

const ALCHEMY_ETH = process.env.ALCHEMY_ETH_RPC!
const ALCHEMY_ARB = process.env.ALCHEMY_ARB_RPC!

type Network = "ethereum" | "arbitrum"

type Token = {
  symbol: string
  balance: number
  price: number
  value: number
  network: Network
  contractAddress: string
}

function getRpc(network: Network) {
  return network === "ethereum" ? ALCHEMY_ETH : ALCHEMY_ARB
}

async function fetchPrices(contracts: { contract: string; network: Network }[]) {
  const prices: Record<string, number> = {}

  for (const item of contracts) {
    try {
      const platform =
        item.network === "ethereum" ? "ethereum" : "arbitrum-one"

      const url = `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${item.contract}&vs_currencies=usd`

      const response = await fetch(url)

      if (!response.ok) continue

      const data = await response.json()

      const price = data[item.contract.toLowerCase()]?.usd

      if (price) {
        prices[item.contract.toLowerCase()] = price
      }
    } catch (e) {
      console.log("Erro preço:", e)
    }
  }

  return prices
}

async function getNativeBalance(address: string, network: Network): Promise<Token | null> {
  const provider = new ethers.JsonRpcProvider(getRpc(network))

  const balance = await provider.getBalance(address)

  const formatted = Number(ethers.formatEther(balance))

  if (formatted <= 0) return null

  const priceResp = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd`
  )

  const priceData = await priceResp.json()

  const price = priceData.ethereum.usd

  return {
    symbol: "ETH",
    balance: formatted,
    price,
    value: formatted * price,
    network,
    contractAddress: network + "-native"
  }
}

async function getERC20Tokens(address: string, network: Network): Promise<Token[]> {
  const provider = new ethers.JsonRpcProvider(getRpc(network))

  const balances = await provider.send("alchemy_getTokenBalances", [
    address
  ])

  const tokensRaw = balances.tokenBalances

  const tokens: Token[] = []

  for (const token of tokensRaw) {
    if (!token.tokenBalance || token.tokenBalance === "0x0") continue

    const metadata = await provider.send("alchemy_getTokenMetadata", [
      token.contractAddress
    ])

    if (!metadata?.symbol || !metadata?.decimals) continue

    const decimals = metadata.decimals

    const raw = token.tokenBalance

    const formatted = Number(
      ethers.formatUnits(raw, decimals)
    )

    if (formatted <= 0) continue

    tokens.push({
      symbol: metadata.symbol,
      balance: formatted,
      price: 0,
      value: 0,
      network,
      contractAddress: token.contractAddress
    })
  }

  // Buscar preços
  const priceMap = await fetchPrices(
    tokens.map((t) => ({
      contract: t.contractAddress,
      network
    }))
  )

  return tokens
    .map((t) => {
      const price = priceMap[t.contractAddress.toLowerCase()] || 0
      return {
        ...t,
        price,
        value: t.balance * price
      }
    })
    .filter((t) => t.value > 0)
}

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()

    if (!address) {
      return NextResponse.json({ error: "Endereço inválido" }, { status: 400 })
    }

    const ethNative = await getNativeBalance(address, "ethereum")
    const arbNative = await getNativeBalance(address, "arbitrum")

    const ethTokens = await getERC20Tokens(address, "ethereum")
    const arbTokens = await getERC20Tokens(address, "arbitrum")

    const tokens: Token[] = [
      ...(ethNative ? [ethNative] : []),
      ...(arbNative ? [arbNative] : []),
      ...ethTokens,
      ...arbTokens
    ]

    const total = tokens.reduce((sum, t) => sum + t.value, 0)

    return NextResponse.json({
      tokens,
      total
    })
  } catch (error) {
    console.error("Erro API wallet:", error)
    return NextResponse.json(
      { error: "Erro interno ao consultar carteira" },
      { status: 500 }
    )
  }
}