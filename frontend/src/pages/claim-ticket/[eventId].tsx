import { GetServerSideProps } from 'next'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import NextLink from 'next/link'
import supabase from '@/lib/supabase'
import { fetchWithSignature } from '@/lib/fetchWithSignature'
import {
  useAddress,
  useContract,
  useContractWrite,
  useConnectedWallet,
} from '@thirdweb-dev/react'
import EventAbi from '@/contracts/EventAbi.json'
import {
  Stack,
  Box,
  Button,
  Text,
  Link,
  Tooltip,
  HStack,
} from '@chakra-ui/react'
import type { Event, Claim } from '@/types'
import alchemyClient from '@/lib/alchemy'
import { useAuth } from '@/contexts/AuthProvider'

interface ClaimTicketProps {
  event: Event
  claim: Claim
}

export const getServerSideProps: GetServerSideProps<ClaimTicketProps> = async (
  context,
) => {
  const { eventId, claimId } = context.query

  const { data: claimData } = await supabase
    .from('claims')
    .select('*, event:events(*, group:groups(*))')
    .eq('id', claimId)
    .eq('events.id', eventId)
    .maybeSingle()

  if (!claimData) {
    return {
      notFound: true,
    }
  }

  const event: Event = {
    id: claimData.event.id,
    contractAddress: claimData.event.contract_address,
    title: claimData.event.title,
    description: claimData.event.description,
    thumbnail: claimData.event.thumbnail,
    group: {
      id: claimData.event.group.id,
      name: claimData.event.group.name,
      contractAddress: claimData.event.group.contract_address,
    },
  }

  const claim: Claim = {
    id: claimId as string,
    eventId: event.id,
    claimEndDate: claimData.claim_end_date as string,
  }

  return {
    props: {
      event,
      claim,
    },
  }
}

const useIsClaimExpired = (claimEndDate: string) => {
  const [isExpired, setIsExpired] = useState<boolean>(false)
  const [serverTime, setServerTime] = useState(null)

  useEffect(() => {
    const fetchTime = async () => {
      const res = await fetch('/api/current-time')
      const { currentTime } = await res.json()
      setServerTime(currentTime)
    }
    fetchTime()
  }, [])

  useEffect(() => {
    if (serverTime) {
      const now = new Date(serverTime)
      const claimEnd = new Date(claimEndDate)
      setIsExpired(now > claimEnd)
    }
  }, [claimEndDate, serverTime])

  console.log('isExpired', isExpired)
  return isExpired
}

const ClaimTicket = ({ event, claim }: ClaimTicketProps) => {
  const { authSignIn, user } = useAuth()

  const connectedWallet = useConnectedWallet()
  const address = useAddress()
  const isClaimExpired = useIsClaimExpired(claim.claimEndDate)

  const [tokenIds, setTokenIds] = useState<number[]>([])

  const { contract: eventContract } = useContract(
    event.contractAddress,
    EventAbi,
  )
  const { mutateAsync: mutateClaim, isLoading } = useContractWrite(
    eventContract,
    'claim',
  )

  const claimTicket = async (tokenId: number) => {
    if (!connectedWallet) return

    const response = await fetchWithSignature(
      '/api/auth/getSignatureToClaim',
      connectedWallet,
      {
        method: 'POST',
        body: JSON.stringify({
          contractAddress: event.contractAddress,
          eventId: event.id,
          tokenId,
          claimId: claim.id,
        }),
      },
    )

    if (response.status === 400) {
      const data = await response.json()
      alert(data.message)
      return
    }

    const { signature } = await response.json()
    console.log('signature', signature)
    if (!signature) {
      alert('You cannot claim')
      return
    }

    // TODO
    const { receipt } = await mutateClaim({
      args: [tokenId, signature],
    })
  }

  useEffect(() => {
    const fetchUserNfts = async () => {
      if (!address) return
      const { ownedNfts } = await alchemyClient.nft.getNftsForOwner(address, {
        contractAddresses: [event.contractAddress],
      })
      console.log('ownedNfts', ownedNfts)

      setTokenIds(ownedNfts.map((nft) => Number(nft.tokenId)))
    }
    fetchUserNfts()
  }, [address, event.contractAddress])

  return (
    <Stack gap={4}>
      <HStack fontSize={'xl'}>
        <Link as={NextLink} color='teal.500' href={`/events/${event.id}`}>
          {event.title}
        </Link>
        <Text>参加確定ページ</Text>
      </HStack>
      <Text>
        参加確定ボタンを押すと、チケットNFTが転送不可の「参加証明SBT」になります
      </Text>

      {!user && (
        <Button
          colorScheme='white'
          bg='black'
          rounded={'full'}
          onClick={authSignIn}
        >
          ログイン
        </Button>
      )}

      {user && (
        <>
          {tokenIds.map((tokenId) => (
            <Box key={tokenId}>
              <Tooltip
                label={isClaimExpired ? 'Claim period has ended.' : ''}
                aria-label='A tooltip explaining why the button is disabled'
              >
                <span>
                  <Button
                    onClick={() => claimTicket(tokenId)}
                    isDisabled={isClaimExpired}
                  >
                    Claim Ticket (ID: {tokenId})
                  </Button>
                </span>
              </Tooltip>
              <Text fontSize='sm' mt={2}>
                {`Claim End Date: ${new Date(
                  claim.claimEndDate,
                ).toLocaleDateString()}`}
              </Text>
            </Box>
          ))}
        </>
      )}
    </Stack>
  )
}

export default ClaimTicket
