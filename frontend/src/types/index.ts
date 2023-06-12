import { BigNumber } from 'ethers'

import { ParticipantTypes } from '@/constants'

export type ParticipantType = keyof typeof ParticipantTypes

export type Group = {
  id: string
  contractAddress: string
  name: string
  balance?: string
  subtitle?: string
  thumbnail?: string
  members?: GroupMember[]
  events?: Event[]
}

export type GroupMember = {
  groupId: string
  address: string
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
}

export type Ticket = {
  name: string
  fee: BigNumber
  maxParticipants: number
  currentParticipants: number
  participantType: ParticipantType
  metadataURI: string
  isActive: boolean
  requireSignature: boolean
  ruleType?: MintRuleType
}

export type MintRuleType = 'allowlist' | 'code' | 'nft'

export type MintRule = {
  eventId: string
  ticketIndex: number
  ruleType: MintRuleType
}

export type TicketOwner = {
  walletAddress: string
  tokenIds: number[]
}
