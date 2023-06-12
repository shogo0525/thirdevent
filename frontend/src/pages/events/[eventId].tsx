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
} from '@chakra-ui/react'
import { ExternalLinkIcon, AddIcon } from '@chakra-ui/icons'
import type { Event, Ticket, MintRule, TicketOwner } from '@/types'
import { truncateContractAddress } from '@/utils'
import { MultiLineBody } from '@/components/MultiLineBody'
import alchemyClient from '@/lib/alchemy'
import { TicketCard } from '@/components/TicketCard'
import { TicketForm, FormData as TicketFormData } from '@/components/TicketForm'
import QRCode from 'qrcode'

interface EventDetailProps {
  event: Event
  mintRules: MintRule[]
  ticketOwners: TicketOwner[]
  claimTicketUrl: string
  claimQRCode: string
}

export const getServerSideProps: GetServerSideProps<EventDetailProps> = async (
  context,
) => {
  const { eventId } = context.query
  const { host, 'x-forwarded-proto': proto } = context.req.headers

  const { data: eventData } = await supabase
    .from('events')
    .select('*, group:groups(*)')
    .eq('id', eventId)
    .maybeSingle()
  // console.log(eventData)

  if (!eventData) {
    return {
      notFound: true,
    }
  }

  const { data: mintRuleData } = await supabase
    .from('mint_rules')
    .select('event_id, ticket_index, rule_type')
    .eq('event_id', eventId)

  const mintRules: MintRule[] = (mintRuleData ?? []).map((d) => ({
    eventId: d.event_id,
    ticketIndex: d.ticket_index,
    ruleType: d.rule_type,
  }))

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

  const { owners } = await alchemyClient.nft.getOwnersForContract(
    event.contractAddress,
    {
      withTokenBalances: true,
    },
  )

  const ticketOwners: TicketOwner[] = owners.map((owner) => ({
    walletAddress: owner.ownerAddress,
    tokenIds: owner.tokenBalances.map((tb) => parseInt(tb.tokenId, 16)),
  }))

  const claimTicketUrl = `${proto}://${host}/claim-ticket/${eventId}`
  const claimQRCode = await QRCode.toDataURL(claimTicketUrl)

  return {
    props: {
      event,
      mintRules,
      ticketOwners,
      claimTicketUrl,
      claimQRCode,
    },
  }
}

const EventDetail = ({
  event,
  mintRules,
  ticketOwners,
  claimTicketUrl,
  claimQRCode,
}: EventDetailProps) => {
  const sdk = useSDK()
  const address = useAddress()

  const { contract: groupContract } = useContract(
    event.group.contractAddress,
    GroupAbi,
  )

  const { contract: eventContract } = useContract(
    event.contractAddress,
    EventAbi,
  )

  const { data: groupNftCount } = useContractRead(groupContract, 'balanceOf', [
    address,
  ])
  const isGroupMember = Number(groupNftCount) > 0

  // TODO: indexで管理が正しいか検討
  const { data: ticketTypes } = useContractRead(
    eventContract,
    'getAllTicketTypes',
  )
  // console.log('ticketTypes', ticketTypes)

  const tickets = (ticketTypes?.map((ticket: Ticket, i: number) => {
    const mintRule = mintRules.find((rule) => rule.ticketIndex === i)
    return {
      ...ticket,
      ...(ticket.requireSignature
        ? {
            ruleType: mintRule?.ruleType,
          }
        : null),
    }
  }) ?? []) as Ticket[]
  console.log('tickets', tickets)

  const {
    mutateAsync: mutateAddTicketType,
    isLoading,
    error,
  } = useContractWrite(groupContract, 'addTicketType')

  const addTicketType = async () => {
    // const ticketType = [
    //   event.contractAddress,
    //   '無料チケット',
    //   // ethers.utils.parseEther('0.0002'),
    //   ethers.utils.parseEther('0'),
    //   5,
    //   1,
    //   'https://example.com/ticket-metadata',
    //   false,
    // ]
    const ticketType = [
      event.contractAddress,
      '有料チケット',
      // ethers.utils.parseEther('0.0002'),
      ethers.utils.parseEther('0.0001'),
      5,
      1,
      'https://example.com/ticket-metadata',
      false,
    ]
    // const ticketType = [
    //   event.contractAddress,
    //   '署名チケット',
    //   // ethers.utils.parseEther('0.0002'),
    //   ethers.utils.parseEther('0'),
    //   5,
    //   1,
    //   'https://example.com/ticket-metadata',
    //   true,
    // ]
    try {
      const { receipt } = await mutateAddTicketType({ args: ticketType })
      console.log('receipt', receipt)
    } catch (e) {
      console.log('e', e)
    }
  }

  const { mutateAsync: mutateMint, isLoading: isMinting } = useContractWrite(
    eventContract,
    'mint',
  )
  const mintTicket = async (
    ticketTypeIndex: number,
    costWei: number,
    requireSignature: boolean,
    code?: string,
  ) => {
    try {
      if (requireSignature) {
        if (!sdk?.wallet) return
        const response = await fetchWithSignature(
          '/api/getSignatureToMint',
          sdk.wallet,
          {
            method: 'POST',
            body: JSON.stringify({
              walletAddress: address,
              contractAddress: event.contractAddress,
              eventId: event.id,
              ticketIndex: ticketTypeIndex,
              code,
            }),
          },
        )

        const { signature } = await response.json()
        if (!signature) {
          alert('You cannot mint')
          return
        }

        const { receipt } = await mutateMint({
          args: [ticketTypeIndex, signature],
          overrides: { value: costWei },
        })

        return
      }

      const { receipt } = await mutateMint({
        args: [ticketTypeIndex, '0x'],
        overrides: { value: costWei },
      })
    } catch (e) {
      console.log('e', e)
    }
  }

  const eventData = [
    {
      label: 'イベント名',
      content: event.title,
    },
    {
      label: '主催',
      content: event.group.name,
      href: `/groups/${event.group.id}`,
    },
    {
      label: 'コントラクトアドレス',
      content: truncateContractAddress(event.contractAddress),
      href: `https://mumbai.polygonscan.com/address/${event.contractAddress}`,
      target: '_blank',
    },
    {
      content: event.description,
      useMultiLineBody: true,
    },
  ]

  const onSubmitHandler = async (data: TicketFormData) => {
    const ticketType = [
      event.contractAddress,
      data.name,
      ethers.utils.parseEther(data.fee),
      data.maxParticipants,
      data.participantType,
      'https://example.com/ticket-metadata',
      data.requireSignature,
    ]
    try {
      const { receipt } = await mutateAddTicketType({ args: ticketType })
      console.log('receipt', receipt)
    } catch (e) {
      console.log('e', e)
    }
  }

  const { isOpen, onOpen, onClose } = useDisclosure()

  const tokenOfUser = ticketOwners.find(
    (owner) => owner.walletAddress.toLowerCase() === address?.toLowerCase(),
  )
  console.log('tokenOfUser', tokenOfUser)

  return (
    <Grid templateColumns={{ base: '100%', md: '65% 35%' }} gap={4}>
      <GridItem>
        <Stack>
          <Modal closeOnOverlayClick={false} isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>チケット作成</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <TicketForm onSubmitHandler={onSubmitHandler} />
              </ModalBody>
            </ModalContent>
          </Modal>

          <Heading as='h2' size='lg'>
            {event.title}
          </Heading>

          <Image
            src={event.thumbnail}
            alt={event.title}
            width='100%'
            height={{ base: '200px', md: '300px' }}
            objectFit='cover'
            borderRadius='lg'
          />

          {tickets.length > 0 && (
            <Stack>
              {tickets.map((ticket, i: number) => (
                <TicketCard
                  key={i}
                  ticketIndex={i}
                  ticket={ticket}
                  onClick={mintTicket}
                />
              ))}
            </Stack>
          )}
          {isGroupMember && (
            <IconButton
              variant='outline'
              colorScheme='teal'
              aria-label='Add Ticket'
              fontSize='20px'
              icon={<AddIcon />}
              onClick={onOpen}
            />
          )}

          {ticketOwners.length > 0 && (
            <Stack>
              <Text>チケット保有者</Text>
              {ticketOwners.map((owner, i: number) => (
                <React.Fragment key={i}>
                  <Link as={NextLink} color='teal.500' href={`/users/${owner}`}>
                    {owner.walletAddress}
                  </Link>
                  <Text>保有 Token Id: {owner.tokenIds.join(',')}</Text>
                </React.Fragment>
              ))}
            </Stack>
          )}
        </Stack>
      </GridItem>
      <GridItem justifyItems='center'>
        <Stack>
          <Card borderRadius='lg'>
            <CardBody p={0}>
              <Stack mt={2} spacing={3} p={3}>
                {eventData.map(
                  ({ label, content, href, target, useMultiLineBody }, i) => {
                    return (
                      <React.Fragment key={i}>
                        <Stack direction='row' justifyContent='space-between'>
                          {label && (
                            <Text size='md' fontWeight='bold'>
                              {label}
                            </Text>
                          )}
                          {content && (
                            <>
                              {useMultiLineBody ? (
                                <MultiLineBody body={content} />
                              ) : href ? (
                                <Link
                                  as={NextLink}
                                  color='teal.500'
                                  href={href}
                                  target={target ?? '_self'}
                                >
                                  <Flex alignItems='center' gap={1}>
                                    {content}
                                    {target === '_blank' && (
                                      <ExternalLinkIcon color='teal.500' />
                                    )}
                                  </Flex>
                                </Link>
                              ) : (
                                <Text size='md'>{content}</Text>
                              )}
                            </>
                          )}
                        </Stack>

                        {i !== eventData.length - 1 && <Divider />}
                      </React.Fragment>
                    )
                  },
                )}
              </Stack>
            </CardBody>
          </Card>

          {isGroupMember && (
            <>
              <Text>参加受付用QRコード</Text>
              <Link as={NextLink} color='teal.500' href={claimTicketUrl}>
                {claimTicketUrl}
              </Link>
              <Image mt={4} src={claimQRCode} alt='qr' width='200px' />
            </>
          )}
        </Stack>
      </GridItem>
    </Grid>
  )
}

export default EventDetail
