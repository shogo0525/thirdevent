import { GetServerSideProps } from 'next'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import NextLink from 'next/link'
import supabase from '@/lib/supabase'
import { fetchWithSignature } from '@/lib/fetchWithSignature'
import { ethers } from 'ethers'
import {
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
  HStack,
  Stack,
  Flex,
  Badge,
  Box,
  Button,
  Grid,
  GridItem,
  Avatar,
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
import type { User, Event, Ticket } from '@/types'
import { truncateContractAddress } from '@/utils'
import { MultiLineBody } from '@/components/MultiLineBody'
import alchemyClient from '@/lib/alchemy'
import { TicketCard } from '@/components/TicketCard'
import { TicketForm, FormData as TicketFormData } from '@/components/TicketForm'
import QRCode from 'qrcode'

interface EventDetailProps {
  event: Event
  ticketOwners: User[]
}

export const getServerSideProps: GetServerSideProps<EventDetailProps> = async (
  context,
) => {
  const { eventId } = context.query

  const { data: eventData } = await supabase
    .from('events')
    .select('*, group:groups(*), tickets(id, name, thumbnail, rule_type)')
    .eq('id', eventId)
    .maybeSingle()
  console.log(eventData)

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
    tickets: eventData.tickets.map((t: any) => ({
      ticketId: t.id,
      name: t.name,
      thumbnail: t.thumbnail,
      ruleType: t.rule_type,
    })),
  }

  // TODO
  const { owners } = await alchemyClient.nft.getOwnersForContract(
    event.contractAddress,
    {
      withTokenBalances: true,
    },
  )

  const holderAddresses = owners.map((owner) => owner.ownerAddress)

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .in('wallet_address', holderAddresses)

  const ticketOwners: User[] = holderAddresses.map((holderAddress) => {
    const user = users?.find((u) => u.wallet_address === holderAddress)
    console.log(users, user)

    return (user || {
      id: '',
      walletAddress: holderAddress,
      name: 'NON thirdevent User',
    }) as User
  })

  console.log('ticketOwners', ticketOwners)

  return {
    props: {
      event,
      ticketOwners,
    },
  }
}

const EventDetail = ({ event, ticketOwners }: EventDetailProps) => {
  const connectedWallet = useConnectedWallet()
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

  const { data: ticketTypes } = useContractRead(
    eventContract,
    'getAllTicketTypes',
  )
  // console.log('ticketTypes', ticketTypes)

  const tickets: Ticket[] = (ticketTypes ?? []).map(
    (ticket: Ticket, i: number) => {
      const ticketMetadata = event.tickets?.find(
        (t) => t.ticketId === ticket.ticketId,
      )
      console.log('ticketMetadata', ticketMetadata)
      return {
        ...ticket,
        ruleType: ticketMetadata?.ruleType,
      }
    },
  )
  console.log('tickets', tickets)

  const { mutateAsync: mutateMint, isLoading } = useContractWrite(
    eventContract,
    'mint',
  )
  const mintTicket = async (
    ticketId: string,
    costWei: number,
    requireSignature: boolean,
    code?: string,
  ) => {
    try {
      let sig = '0x'

      if (requireSignature) {
        if (!connectedWallet) return
        const response = await fetchWithSignature(
          '/api/auth/getSignatureToMint',
          connectedWallet,
          {
            method: 'POST',
            body: JSON.stringify({
              contractAddress: event.contractAddress,
              eventId: event.id,
              ticketId,
              code,
            }),
          },
        )

        const { signature } = await response.json()
        if (!signature) {
          alert('You cannot mint')
          return
        }

        sig = signature
      }

      const { receipt } = await mutateMint({
        args: [ticketId, sig],
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

  const { mutateAsync: mutateAddTicketType, error } = useContractWrite(
    groupContract,
    'addTicketType',
  )

  const onSubmitHandler = async (newTicketId: string, data: TicketFormData) => {
    const ticketType = [
      event.contractAddress,
      newTicketId,
      data.name,
      ethers.utils.parseEther(data.fee),
      data.maxParticipants,
      data.participantType,
      data.img,
      data.requireSignature,
    ]
    try {
      const { receipt } = await mutateAddTicketType({ args: ticketType })
      console.log('receipt', receipt)
      onClose()
    } catch (e) {
      console.log('e', e)
    }
  }

  const { isOpen, onOpen, onClose } = useDisclosure()

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
                <TicketForm event={event} onSubmitHandler={onSubmitHandler} />
              </ModalBody>
            </ModalContent>
          </Modal>

          <HStack justifyContent={'space-between'}>
            <Heading as='h2' size='lg'>
              {event.title}
            </Heading>
            {isGroupMember && (
              <Button
                as={NextLink}
                href={`/events/${event.id}/edit`}
                colorScheme='white'
                bg='black'
                rounded={'full'}
              >
                受付管理
              </Button>
            )}
          </HStack>

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
              {tickets.map((ticket, i: number) => {
                const ticketMetadata = event.tickets?.find(
                  (t) => t.ticketId === ticket.ticketId,
                )

                return (
                  <TicketCard
                    key={i}
                    ticket={ticket}
                    thumbnail={ticketMetadata?.thumbnail}
                    onClick={mintTicket}
                  />
                )
              })}
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
        </Stack>
      </GridItem>
      <GridItem justifyItems='center'>
        <Stack spacing={4}>
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

          <Heading fontSize={'md'}>参加者</Heading>
          {ticketOwners?.map((owner, i: number) => (
            <React.Fragment key={i}>
              {owner.id ? (
                <Link
                  as={NextLink}
                  key={owner.id}
                  color='teal.500'
                  href={`/users/${owner.id}`}
                >
                  <HStack>
                    <Avatar src={owner.thumbnail} size='sm' />
                    <Text>{owner.name}</Text>
                  </HStack>
                </Link>
              ) : (
                <HStack>
                  <Avatar src={owner.thumbnail} size='sm' />
                  <Text>{owner.name}</Text>
                </HStack>
              )}
            </React.Fragment>
          ))}
        </Stack>
      </GridItem>
    </Grid>
  )
}

export default EventDetail
