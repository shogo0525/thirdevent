import type { TransactionReceipt } from '@ethersproject/abstract-provider'

export const truncateContractAddress = (addr: string) =>
  `${addr.slice(0, 5)}...${addr.slice(-5)}`

export const isTokenExpired = (tokenExpiration?: string | number) => {
  if (tokenExpiration === undefined) return true

  let tokenExpirationAsNumber: number
  if (typeof tokenExpiration === 'string') {
    tokenExpirationAsNumber = Number(tokenExpiration)
  } else {
    tokenExpirationAsNumber = tokenExpiration
  }

  return tokenExpirationAsNumber * 1000 < Date.now()
}

export const getEventFromReceipt = (
  receipt: TransactionReceipt,
  eventName: string,
) => {
  const events = (receipt as any).events
  const event = events.find((e: any) => e.event === eventName)
  return event
}
