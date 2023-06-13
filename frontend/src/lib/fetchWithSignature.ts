import type { MetaMaskWallet } from '@thirdweb-dev/wallets'

const SIGN_MESSAGE = `Sign at timestamp ${Date.now()}`

type Options = {
  method?: string
  headers?: Record<string, string>
  body?: any
}

export const fetchWithSignature = async (
  url: string,
  wallet: MetaMaskWallet,
  options: Options = {},
) => {
  const signature = await wallet.signMessage(SIGN_MESSAGE)
  const address = await wallet.getAddress()

  const opts = {
    method: options.method || 'GET',
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      'X-THIRDEVENT-ADDRESS': address,
      'X-THIRDEVENT-MESSAGE': SIGN_MESSAGE,
      'X-THIRDEVENT-SIGNATURE': signature,
    },
    body: options.body ? options.body : null,
  }

  return fetch(url, opts)
}
