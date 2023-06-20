import { useState } from 'react'
import { ethers } from 'ethers'
import {
  HStack,
  Flex,
  Box,
  Button,
  Text,
  Badge,
  Input,
  Image,
  Stack,
} from '@chakra-ui/react'
import type { Ticket } from '@/types'
import { ParticipantTypes } from '@/constants'

type TicketCardProps = {
  ticket: Ticket
  onPurchase: (
    ticketId: string,
    costWei: ethers.BigNumber,
    requireSignature: boolean,
    code?: string,
  ) => void
}

export const TicketCard = ({ ticket, onPurchase }: TicketCardProps) => {
  const formattedPrice = ticket.fee > 0 ? `${ticket.fee} MATIC` : '無料'

  const requireCode = ticket.ruleType && ticket.ruleType === 'code'
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  return (
    <HStack>
      <Image
        alt={ticket.name}
        src={ticket.thumbnail}
        boxSize={40}
        maxH={20}
        minW={20}
        objectFit={'cover'}
      />
      <Box
        color='white'
        bg='purple.600'
        borderRadius='md'
        boxShadow='xl'
        p={2}
        w='full'
        minW={250}
      >
        <Flex justifyContent='space-between' alignItems='center'>
          <Text fontSize='md' fontWeight='bold'>
            {ticket.name}
          </Text>

          <Stack justifyContent='space-between' alignItems='center' gap={2}>
            <Button
              colorScheme='teal'
              size='sm'
              color='white'
              onClick={async () => {
                setIsLoading(true)
                try {
                  await onPurchase(
                    ticket.ticketId,
                    ethers.utils.parseEther(ticket.fee.toString()),
                    ticket.requireSignature,
                    code,
                  )
                } catch (e) {
                  console.log('error', e)
                } finally {
                  setIsLoading(false)
                }
              }}
              isLoading={isLoading}
              isDisabled={requireCode && !code}
            >
              購入({formattedPrice})
            </Button>
            {requireCode && (
              <Input
                placeholder='クーポンコード'
                onChange={(e) => setCode(e.target.value)}
                h={5}
                maxW={150}
                minW={120}
              />
            )}
          </Stack>
        </Flex>
        <Flex
          mt={2}
          gap={2}
          justifyContent='space-between'
          alignItems={{
            base: 'start',
            sm: 'center',
          }}
          flexDirection={{
            base: 'column',
            sm: 'row',
          }}
        >
          <Text fontSize='sm'>
            {`${ticket.currentParticipants} / ${ticket.maxParticipants}`}枚
          </Text>
          <Flex justifyContent='space-between' alignItems='center' gap={2}>
            {ticket.requireSignature && (
              <Badge colorScheme='red'>
                購入条件:{' '}
                {ticket.ruleType === 'nft' ? 'NFT保有' : ticket.ruleType}
              </Badge>
            )}
            <Badge>{ParticipantTypes[ticket.participantType]}</Badge>
          </Flex>
        </Flex>
      </Box>
    </HStack>
  )
}
