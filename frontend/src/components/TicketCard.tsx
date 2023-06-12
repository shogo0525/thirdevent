import { useState } from 'react'
import { ethers } from 'ethers'
import { Flex, Box, Button, Text, Badge, Input } from '@chakra-ui/react'
import type { Ticket } from '@/types'
import { ParticipantTypes } from '@/constants'

type TicketCardProps = {
  ticketIndex: number
  ticket: Ticket
  onClick: (
    ticketTypeIndex: number,
    costWei: number,
    requireSignature: boolean,
    code?: string,
  ) => void
}

export const TicketCard = ({
  ticketIndex,
  ticket,
  onClick,
}: TicketCardProps) => {
  const fee = Number(ticket.fee)
  const price = Number(ethers.utils.formatEther(fee))
  const formattedPrice = price > 0 ? `${price} MATIC` : '無料'

  const requireCode = ticket.ruleType && ticket.ruleType === 'code'
  const [code, setCode] = useState('')

  return (
    <Box color='white' bg='purple.600' borderRadius='md' boxShadow='xl' p={2}>
      <Flex justifyContent='space-between' alignItems='center'>
        <Text fontSize='md' fontWeight='bold'>
          {ticket.name}
        </Text>

        <Flex justifyContent='space-between' alignItems='center' gap={2}>
          {requireCode && (
            <Input
              placeholder='クーポンコード'
              onChange={(e) => setCode(e.target.value)}
            />
          )}
          <Button
            colorScheme='teal'
            size='sm'
            color='white'
            onClick={() =>
              onClick(ticketIndex, fee, ticket.requireSignature, code)
            }
            isDisabled={requireCode && !code}
          >
            購入({formattedPrice})
          </Button>
        </Flex>
      </Flex>
      <Flex justifyContent='space-between' alignItems='center' mt={2}>
        <Text fontSize='sm'>
          {`${ticket.currentParticipants} / ${ticket.maxParticipants}`}枚
        </Text>
        <Flex justifyContent='space-between' alignItems='center' gap={2}>
          {ticket.requireSignature && (
            <Badge colorScheme='red'>購入条件: {ticket.ruleType}</Badge>
          )}
          <Badge>{ParticipantTypes[ticket.participantType]}</Badge>
        </Flex>
      </Flex>
    </Box>
  )
}
