// app/api/wallet/route.ts
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

// ERC20 tokens que vamos checar
const ERC20_TOKENS: Record<Network, string[]> = {
  ethereum: [
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
    "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
  ],
  arbitrum: [
    "0x82af49447d8a07e3bd95bd0d56f35241523fbab1", // WETH (nativo é ARB)
    "0x2f2a2543b76a4166549f7aaB2e75Bef0aefC5B0f", // WBTC
  ],
}

// Provider server-side
function getProvider(network: Network) {
  const url = network === "ethereum" ? ALCHEMY_ETH : ALCHEMY_ARB
  return new ethers.JsonRpcProvider(url)
}

// Busca preço USD via CoinGecko
async function fetchPriceUSD(symbol: string, contract?: string, network?: Network) {
  try {
    if (contract && network) {
      const platform = network === "ethereum" ? "ethereum" : "arbitrum-one"
      const url = `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${contract}&vs_currencies=usd`
      const res = await fetch(url)
      const data = await res.json()
      return data[contract.toLowerCase()]?.usd ?? 0
    } else {
      const id = symbol.toLowerCase() === "eth" ? "ethereum" : symbol.toLowerCase()
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
      const res = await fetch(url)
      const data = await res.json()
      return data[id]?.usd ?? 0
    }
  } catch (err) {
    console.log("Erro fetchPriceUSD:", err)
    return 0
  }
}

// Saldo nativo
async function getNativeBalance(address: string, network: Network): Promise<Token> {
  const provider = getProvider(network)
  const balance = await provider.getBalance(address)
  const formatted = Number(ethers.formatEther(balance))
  const price = await fetchPriceUSD(network === "ethereum" ? "ETH" : "ARB")
  return {
    symbol: network === "ethereum" ? "ETH" : "ARB",
    balance: formatted,
    price,
    value: formatted * price,
    network,
    contractAddress: network + "-native",
  }
}

// ERC20
async function getERC20TokenBalance(
  provider: ethers.JsonRpcProvider,
  tokenAddress: string,
  wallet: string,
  network: Network
): Promise<Token | null> {
  try {
    const abi = [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
    ]
    const contract = new ethers.Contract(tokenAddress, abi, provider)
    const [balanceRaw, decimals, symbol] = await Promise.all([
      contract.balanceOf(wallet),
      contract.decimals(),
      contract.symbol(),
    ])
    const balance = Number(ethers.formatUnits(balanceRaw, decimals))
    if (balance <= 0) return null
    const price = await fetchPriceUSD(symbol, tokenAddress, network)
    return { symbol, balance, price, value: balance * price, network, contractAddress: tokenAddress }
  } catch (err) {
    console.log("Erro ERC20:", err)
    return null
  }
}

// API POST
export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()
    if (!address) return NextResponse.json({ error: "Endereço inválido" }, { status: 400 })

    const networks: Network[] = ["ethereum", "arbitrum"]
    const tokens: Token[] = []

    for (const network of networks) {
      const provider = getProvider(network)
      // nativo
      const native = await getNativeBalance(address, network)
      tokens.push(native)
      // ERC20
      for (const tokenAddress of ERC20_TOKENS[network]) {
        const token = await getERC20TokenBalance(provider, tokenAddress, address, network)
        if (token) tokens.push(token)
      }
    }

    const total = tokens.reduce((sum, t) => sum + t.value, 0)
    return NextResponse.json({ tokens, total })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Erro ao buscar tokens" }, { status: 500 })
  }
}