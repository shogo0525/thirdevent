import { GetServerSideProps } from 'next'
import React, { useState } from 'react'
import NextLink from 'next/link'
import supabase from '@/lib/supabase'
import { fetchWithSignature } from '@/lib/fetchWithSignature'
import { ethers } from 'ethers'
import {
  useContract,
  useContractRead,
  useContractWrite,
} from '@thirdweb-dev/react'
import GroupAbi from '@/contracts/GroupAbi.json'
import EventAbi from '@/contracts/EventAbi.json'
import {
  HStack,
  Stack,
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
  AspectRatio,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { ExternalLinkIcon, AddIcon } from '@chakra-ui/icons'
import type { User, Event, Ticket } from '@/types'
import { truncateContractAddress } from '@/utils'
import { MultiLineBody } from '@/components/MultiLineBody'
import alchemyClient from '@/lib/alchemy'
import { TicketCard } from '@/components/TicketCard'
import { TicketForm, FormData as TicketFormData } from '@/components/TicketForm'
import { useAuth } from '@/contexts/AuthProvider'
import { thirdwebSDK } from '@/lib/thirdwebSDK'
import { OPENSEA_LINK, SCAN_BASE_LINK } from '@/constants'

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

  if (!eventData) {
    return {
      notFound: true,
    }
  }

  const eventContract = await thirdwebSDK.getContract(
    eventData.contract_address,
    EventAbi,
  )
  const ticketData = await eventContract.call('getAllTicketTypes')

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
      thumbnail: eventData.group.thumbnail,
    },
    tickets: eventData.tickets.map((t: any) => {
      const ticketDataFromContract = ticketData.find(
        (ticket: any) => ticket.ticketId === t.id,
      )
      return {
        ticketId: t.id,
        name: t.name,
        maxParticipants: Number(ticketDataFromContract?.maxParticipants),
        currentParticipants: Number(
          ticketDataFromContract?.currentParticipants,
        ),
        fee: Number(ethers.utils.formatEther(ticketDataFromContract?.fee)),
        participantType: ticketDataFromContract?.participantType,
        requireSignature: ticketDataFromContract?.requireSignature,
        thumbnail: t.thumbnail,
        ruleType: t.rule_type,
      }
    }),
  }

  const { owners: holderAddresses } =
    await alchemyClient.nft.getOwnersForContract(event.contractAddress)

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .in('wallet_address', holderAddresses)

  const ticketOwners: User[] = holderAddresses.map((holderAddress) => {
    const user = users?.find((u) => u.wallet_address === holderAddress)

    return (user || {
      id: '',
      walletAddress: holderAddress,
      name: 'NON thirdevent User',
    }) as User
  })

  return {
    props: {
      event,
      ticketOwners,
    },
  }
}

const EventDetail = ({ event, ticketOwners }: EventDetailProps) => {
  const { user, connectedWallet } = useAuth()
  const toast = useToast()
  const {
    isOpen: isTicketFormOpen,
    onOpen: onTicketFormOpen,
    onClose: onTicketFormClose,
  } = useDisclosure()

  const { isOpen, onOpen, onClose } = useDisclosure()
  const [tickets, setTickets] = useState<Ticket[]>(event.tickets ?? [])

  const { contract: groupContract } = useContract(
    event.group.contractAddress,
    GroupAbi,
  )

  const { contract: eventContract } = useContract(
    event.contractAddress,
    EventAbi,
  )

  const { data: groupNftCount } = useContractRead(groupContract, 'balanceOf', [
    user?.walletAddress,
  ])
  const isGroupMember = Number(groupNftCount) > 0 && user

  const [mintedData, setMintedData] = useState<{
    ticket: Ticket
    transactionHash: string
  } | null>(null)
  const { mutateAsync: mutateMint, isLoading: isMinting } = useContractWrite(
    eventContract,
    'mint',
  )
  const mintTicket = async (
    ticketId: string,
    costWei: ethers.BigNumber,
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

      const {
        receipt: { transactionHash },
      } = await mutateMint({
        args: [ticketId, sig],
        overrides: { value: costWei },
      })

      const ticket = tickets.find((t) => t.ticketId === ticketId)
      if (!ticket) return
      setMintedData({
        ticket,
        transactionHash,
      })
      onOpen()

      const { error } = await supabase.from('participants').insert({
        user_id: user?.id,
        event_id: event.id,
        ticket_id: ticketId,
      })
    } catch (e) {
      console.log('e', e)
    }
  }

  const { mutateAsync: mutateAddTicketType } = useContractWrite(
    groupContract,
    'addTicketType',
  )

  const onSubmitHandler = async (
    newTicketId: string,
    data: TicketFormData,
    metadataURI: string,
    thumbnail: string,
  ) => {
    const ticketType = [
      event.contractAddress,
      newTicketId,
      data.name,
      ethers.utils.parseEther(data.fee),
      data.maxParticipants,
      data.participantType,
      metadataURI,
      data.requireSignature,
    ]
    try {
      await mutateAddTicketType({ args: ticketType })

      setTickets((prev) => [
        ...prev,
        {
          ticketId: newTicketId,
          name: data.name,
          maxParticipants: data.maxParticipants,
          currentParticipants: 0,
          fee: Number(data.fee),
          participantType: data.participantType,
          requireSignature: data.requireSignature,
          thumbnail: thumbnail,
          ruleType: data.ruleType,
        } as Ticket,
      ])

      onTicketFormClose()
    } catch (e) {
      console.log('e', e)
    }
  }

  const eventData = [
    {
      label: 'イベント名',
      content: <Text size='md'>{event.title}</Text>,
    },
    {
      label: '主催',
      content: (
        <Link as={NextLink} color='teal.500' href={`/groups/${event.group.id}`}>
          <HStack>
            <Avatar src={event.group?.thumbnail} size='sm' />
            <Text fontSize='md'>{event.group.name}</Text>
          </HStack>
        </Link>
      ),
    },
    {
      label: 'コントラクトアドレス',
      content: (
        <Link
          as={NextLink}
          color='teal.500'
          href={`${SCAN_BASE_LINK}/address/${event.contractAddress}`}
          target='_blank'
        >
          <HStack alignItems='center' gap={1}>
            <Text>{truncateContractAddress(event.contractAddress)}</Text>
            <ExternalLinkIcon color='teal.500' />
          </HStack>
        </Link>
      ),
    },
    {
      content: <MultiLineBody body={event.description ?? ''} />,
    },
  ]

  return (
    <>
      <Modal
        closeOnOverlayClick={false}
        isOpen={isTicketFormOpen}
        onClose={onTicketFormClose}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>チケット作成</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <TicketForm event={event} onSubmitHandler={onSubmitHandler} />
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal
        closeOnOverlayClick={false}
        isOpen={isOpen}
        onClose={onClose}
        isCentered
      >
        <ModalOverlay
          bg='blackAlpha.300'
          backdropFilter='blur(10px) hue-rotate(45deg)'
        />
        <ModalContent>
          <ModalHeader>チケットを購入しました</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {mintedData && (
              <Stack>
                <Text>{mintedData.ticket.name}</Text>
                <Image
                  src={mintedData.ticket.thumbnail}
                  alt={mintedData.ticket.name}
                  boxSize={200}
                  w='100%'
                  objectFit={'cover'}
                />
              </Stack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme='blue'
              as='a'
              href={OPENSEA_LINK}
              target='_blank'
            >
              OpenSeaで確認する
            </Button>
            {mintedData && (
              <Button
                variant='ghost'
                as='a'
                href={`${SCAN_BASE_LINK}/tx/${mintedData.transactionHash}`}
                target='_blank'
              >
                polygonscanで確認する
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Grid templateColumns={{ base: '100%', md: '65% 35%' }} gap={4}>
        <GridItem>
          <Stack spacing={4}>
            <Stack bg='white' p={2} borderRadius={'lg'}>
              <AspectRatio ratio={2 / 1}>
                <Image
                  src={event.thumbnail}
                  alt={event.title}
                  objectFit='cover'
                  borderRadius='lg'
                />
              </AspectRatio>
              <Heading as='h2' size='lg'>
                {event.title}
              </Heading>
              <HStack>
                <Avatar src={event.group?.thumbnail} size='sm' />
                <Text fontSize='sm'>Hosted by {event.group.name}</Text>
              </HStack>
              {isGroupMember && (
                <Button
                  as={NextLink}
                  href={`/events/${event.id}/admin`}
                  colorScheme='white'
                  bg='black'
                  rounded={'full'}
                >
                  イベント管理
                </Button>
              )}
            </Stack>

            {tickets.length > 0 && (
              <Stack>
                {tickets.map((t) => (
                  <TicketCard
                    key={t.ticketId}
                    ticket={t}
                    onPurchase={(
                      ticketId: string,
                      costWei: ethers.BigNumber,
                      requireSignature: boolean,
                      code?: string,
                    ) => {
                      if (!user) {
                        toast({
                          title: '購入するにはログインをしてください',
                          status: 'warning',
                          duration: 9000,
                          position: 'top',
                          isClosable: true,
                        })
                        return
                      }
                      return mintTicket(
                        ticketId,
                        costWei,
                        requireSignature,
                        code,
                      )
                    }}
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
                onClick={onTicketFormOpen}
              />
            )}
          </Stack>
        </GridItem>
        <GridItem justifyItems='center'>
          <Stack spacing={4}>
            <Card borderRadius='lg'>
              <CardBody p={0}>
                <Stack mt={2} spacing={3} p={3}>
                  {eventData.map(({ label, content }, i) => (
                    <React.Fragment key={i}>
                      <HStack justifyContent='space-between'>
                        {label && (
                          <Text size='md' fontWeight='bold'>
                            {label}
                          </Text>
                        )}
                        {content}
                      </HStack>
                      {i !== eventData.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
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
                    w='fit-content'
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
    </>
  )
}

export default EventDetail
