import { Mumbai } from '@thirdweb-dev/chains'

export const ACTIVE_CHAIN = Mumbai

export const COOKIE = {
  TOKEN_EXPIRATION: 'thirdevent-token_expiration',
  USER_ID: 'thirdevent-user_id',
}

export const ParticipantTypes = {
  0: '一般参加者',
  1: '登壇者',
} as const

export const OPENSEA_LINK = 'https://testnets.opensea.io/ja/account'
export const SCAN_BASE_LINK = 'https://mumbai.polygonscan.com/tx'
