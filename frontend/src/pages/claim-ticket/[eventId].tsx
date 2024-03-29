import { GetServerSideProps } from 'next'
import React, { useState, useEffect } from 'react'
import { MyHead } from '@/components/MyHead'
import { useRouter } from 'next/router'
import NextLink from 'next/link'
import supabase from '@/lib/supabase'
import { fetchWithSignature } from '@/lib/fetchWithSignature'
import { useContract, useContractWrite } from '@thirdweb-dev/react'
import EventAbi from '@/contracts/EventAbi.json'
import {
  Stack,
  Button,
  Text,
  Link,
  Tooltip,
  HStack,
  Image,
  useToast,
} from '@chakra-ui/react'
import type { Event, Claim } from '@/types'
import alchemyClient from '@/lib/alchemy'
import { useAuth } from '@/contexts/AuthProvider'
import { COOKIE } from '@/constants'
import type { NftMetadata, OwnedNft } from 'alchemy-sdk'

interface ClaimTicketProps {
  event: Event
  claim: Claim
  ownedNfts: { tokenId: number; metadata: NftMetadata }[]
}

export const getServerSideProps: GetServerSideProps<ClaimTicketProps> = async (
  context,
) => {
  const { eventId, claimId } = context.query
  // TODO: can be refactored?
  const userId = context.req.cookies[COOKIE.USER_ID] ?? ''

  const { data: claimData } = await supabase
    .from('claims')
    .select(
      `
      *,
      event:events(
        *,
        group:groups(*)
      )
    `,
    )
    .eq('id', claimId)
    .eq('events.id', eventId)
    .maybeSingle()

  if (!claimData) {
    return {
      notFound: true,
    }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('wallet_address')
    .eq('id', userId)
    .maybeSingle()

  const userWalletAddress = userData?.wallet_address

  let nfts: OwnedNft[] = []
  if (userWalletAddress) {
    const { ownedNfts } = await alchemyClient.nft.getNftsForOwner(
      userWalletAddress,
      {
        contractAddresses: [claimData.event.contract_address],
      },
    )
    nfts = ownedNfts
  }

  const ownedNfts = nfts
    .filter((nft) => nft.rawMetadata && nft.rawMetadata.name)
    .map((nft) => ({
      tokenId: Number(nft.tokenId),
      metadata: nft.rawMetadata!,
    }))

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
      ownedNfts,
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

  return isExpired
}

const ClaimTicket = ({ event, claim, ownedNfts }: ClaimTicketProps) => {
  const { authSignIn, user, connectedWallet } = useAuth()
  const toast = useToast()
  const router = useRouter()
  const isClaimExpired = useIsClaimExpired(claim.claimEndDate)

  const { contract: eventContract } = useContract(
    event.contractAddress,
    EventAbi,
  )
  const { mutateAsync: mutateClaim } = useContractWrite(eventContract, 'claim')

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

    if (!response.ok) {
      toast({
        title: '参加確定に失敗しました',
        status: 'error',
        duration: 9000,
        position: 'top',
        isClosable: true,
      })
      return
    }

    const { signature } = await response.json()
    if (!signature) {
      toast({
        title: '参加確定に失敗しました',
        status: 'error',
        duration: 9000,
        position: 'top',
        isClosable: true,
      })
      return
    }

    // TODO: claim to true on supabase
    const { receipt } = await mutateClaim({
      args: [tokenId, signature],
    })
    toast({
      title: '参加確定をしました',
      status: 'success',
      duration: 9000,
      position: 'top',
      isClosable: true,
    })
  }

  return (
    <>
      <MyHead title={`${event.title} 参加受付ページ`} />
      <Stack gap={6} alignItems={'center'}>
        <HStack fontSize={'xl'}>
          <Link as={NextLink} color='teal.500' href={`/events/${event.id}`}>
            {event.title}
          </Link>
          <Text>参加受付ページ</Text>
        </HStack>
        <Text fontWeight={'bold'}>
          参加確定ボタンを押すと、チケットNFTが転送不可の「参加証明SBT」になります
        </Text>

        {!user && (
          <Button
            colorScheme='white'
            bg='black'
            rounded={'full'}
            onClick={async () => {
              await authSignIn()
              router.reload()
            }}
          >
            ログイン
          </Button>
        )}

        {user && ownedNfts.length === 0 && (
          <Text>チケットを保有していません</Text>
        )}

        {user &&
          ownedNfts.map((nft) => (
            <Stack
              key={nft.tokenId}
              flexDirection={{
                base: 'column',
                sm: 'row',
              }}
              alignItems={{
                base: 'center',
                sm: 'start',
              }}
              spacing={4}
            >
              <Image
                src={nft.metadata.image}
                alt={nft.metadata.name}
                boxSize={200}
                objectFit={'cover'}
                borderRadius='lg'
              />
              <Stack>
                <Text fontSize={'lg'}>{nft.metadata.name}</Text>
                <Text fontSize='sm'>
                  {`期限: ${new Date(claim.claimEndDate).toLocaleDateString()}`}
                </Text>
                <Tooltip
                  label={isClaimExpired ? 'Claim period has ended.' : ''}
                  aria-label='A tooltip explaining why the button is disabled'
                >
                  <Button
                    onClick={() => claimTicket(nft.tokenId)}
                    isDisabled={isClaimExpired}
                    w='fit-content'
                    p={6}
                  >
                    参加確定をする
                    <br /> (Token ID: {nft.tokenId})
                  </Button>
                </Tooltip>
              </Stack>
            </Stack>
          ))}
      </Stack>
    </>
  )
}

export default ClaimTicket
