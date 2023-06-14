import { GetServerSideProps } from 'next'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import NextLink from 'next/link'
import supabase from '@/lib/supabase'
import { fetchWithSignature } from '@/lib/fetchWithSignature'
import { ethers } from 'ethers'
import {
  useSDK,
  useAddress,
  useContract,
  useContractRead,
  useContractWrite,
  useConnectedWallet,
} from '@thirdweb-dev/react'
import GroupAbi from '@/contracts/GroupAbi.json'
import EventAbi from '@/contracts/EventAbi.json'
import {
  Container,
  Stack,
  Flex,
  Badge,
  Box,
  Button,
  Grid,
  GridItem,
  Text,
  Heading,
  Divider,
  Link,
  Image,
  Card,
  CardBody,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Tooltip,
} from '@chakra-ui/react'
import { ExternalLinkIcon, AddIcon } from '@chakra-ui/icons'
import type { Event, Ticket, MintRule, TicketOwner } from '@/types'
import { truncateContractAddress } from '@/utils'
import { MultiLineBody } from '@/components/MultiLineBody'
import alchemyClient from '@/lib/alchemy'
import { TicketCard } from '@/components/TicketCard'
import { TicketForm, FormData as TicketFormData } from '@/components/TicketForm'
import QRCode from 'qrcode'

interface ClaimTicketProps {
  event: Event
  claimEndDate: string
}

export const getServerSideProps: GetServerSideProps<ClaimTicketProps> = async (
  context,
) => {
  const { eventId, claim_id } = context.query

  const { data: eventData } = await supabase
    .from('events')
    .select('*, group:groups(*)')
    .eq('id', eventId)
    .maybeSingle()

  if (!eventData) {
    return {
      notFound: true,
    }
  }

  const event: Event = {
    id: eventData.id,
    contractAddress: eventData.contract_address,
    title: eventData.title,
    description: eventData.description,
    thumbnail: eventData.thumbnail,
    group: {
      id: eventData.group.id,
      name: eventData.group.name,
      contractAddress: eventData.group.contract_address,
    },
  }

  const { data: claimData } = await supabase
    .from('claims')
    .select('*')
    .eq('id', claim_id)
    .maybeSingle()

  if (!claimData) {
    return {
      notFound: true,
    }
  }

  const claimEndDate: string = claimData.claim_end_date

  return {
    props: {
      event,
      claimEndDate,
    },
  }
}

const useIsClaimExpired = (claimEndDate: string) => {
  const [isExpired, setIsExpired] = useState<boolean>(false)

  useEffect(() => {
    const now = new Date()
    const claimEnd = new Date(claimEndDate)
    setIsExpired(now > claimEnd)
  }, [claimEndDate])
  console.log('isExpired', isExpired)
  return isExpired
}

const ClaimTicket = ({ event, claimEndDate }: ClaimTicketProps) => {
  const connectedWallet = useConnectedWallet()
  const sdk = useSDK()
  const address = useAddress()
  const isClaimExpired = useIsClaimExpired(claimEndDate)

  const [tokenIds, setTokenIds] = useState<number[]>([])

  const { contract: eventContract } = useContract(
    event.contractAddress,
    EventAbi,
  )
  const { mutateAsync: mutateClaim, isLoading: isMinting } = useContractWrite(
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
        }),
      },
    )

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
    const fetchData = async () => {
      if (!address) return
      const { ownedNfts } = await alchemyClient.nft.getNftsForOwner(address, {
        contractAddresses: [event.contractAddress],
      })
      setTokenIds(ownedNfts.map((nft) => Number(nft.tokenId)))
    }
    fetchData()
  }, [address, event.contractAddress])

  return (
    <Stack gap={4}>
      <Link as={NextLink} color='teal.500' href={`/events/${event.id}`}>
        {event.title}
      </Link>

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
                Claim Ticket {tokenId}
              </Button>
            </span>
          </Tooltip>
          <Text fontSize='sm' mt={2}>
            {`Claim End Date: ${new Date(claimEndDate).toLocaleDateString()}`}
          </Text>
        </Box>
      ))}
    </Stack>
  )
}

export default ClaimTicket
