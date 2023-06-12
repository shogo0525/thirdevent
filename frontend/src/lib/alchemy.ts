import { Alchemy, Network } from 'alchemy-sdk'

const alchemyClient = new Alchemy({
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.MATIC_MUMBAI,
})

export default alchemyClient
