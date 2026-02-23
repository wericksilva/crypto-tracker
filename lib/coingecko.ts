import axios from "axios"

export async function getTokenPrices(ids: string[]) {
  const response = await axios.get(
    `${process.env.COINGECKO_API_URL}/simple/price`,
    {
      params: {
        ids: ids.join(","),
        vs_currencies: "usd",
        include_24hr_change: true,
      },
    }
  )

  return response.data
}