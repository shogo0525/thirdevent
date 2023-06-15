import { BigNumber } from 'ethers'

import { ParticipantTypes } from '@/constants'

export type ParticipantType = keyof typeof ParticipantTypes

export type User = {
  id: string
  walletAddress: string
  name: string
  thumbnail?: string
  groups?: Group[]
}

export type Group = {
  id: string
  contractAddress: string
  name: string
  balance?: string
  subtitle?: string
  thumbnail?: string
  members?: User[]
  events?: Event[]
}

export type Event = {
  id: string
  contractAddress: string
  title: string
  description?: string
  thumbnail?: string
  group: {
    id: string
    name: string
    contractAddress: string
  }
  tickets?: TicketMetadata[]
}

export type TicketRuleType = 'allowlist' | 'code' | 'nft'

export type Ticket = {
  ticketId: string
  name: string
  fee: BigNumber
  maxParticipants: number
  currentParticipants: number
  participantType: ParticipantType
  metadataURI: string
  requireSignature: boolean
  ruleType?: TicketRuleType
}
export type TicketMetadata = {
  ticketId: string
  name: string
  thumbnail: string
  ruleType?: TicketRuleType
}

export type Claim = {
  id: string
  eventId: string
  claimEndDate: string
}
