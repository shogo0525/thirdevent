import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useRouter } from 'next/router'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Text,
  Image,
} from '@chakra-ui/react'
import { v4 as uuidv4 } from 'uuid'
import supabase from '@/lib/supabase'
import QRCode from 'qrcode'

const schema = z.object({
  claim_end_date: z.string(),
})

export type FormData = z.infer<typeof schema>

type EventFormProps = {
  onSubmitHandler: (data: FormData) => Promise<void>
}

const EventForm = ({ onSubmitHandler }: EventFormProps) => {
  const [claimTickets, setClaimTickets] = React.useState<
    Array<{ url: string; endDate: string }>
  >([])
  const [qrCodes, setQrCodes] = React.useState<string[]>([])
  const router = useRouter()
  const { eventId } = router.query

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  React.useEffect(() => {
    const fetchClaimTickets = async () => {
      try {
        let { data: claims } = await supabase
          .from('claims')
          .select('*')
          .eq('event_id', eventId)
        console.log('claims: ', claims)

        const proto = window.location.protocol
        const host = window.location.host

        if (claims && claims.length > 0) {
          const tickets = claims.map((claim) => ({
            url: `${proto}//${host}/claim-ticket/${eventId}?claim_id=${claim.id}`,
            endDate: claim.claim_end_date,
          }))

          setClaimTickets(tickets)
        } else {
          setClaimTickets([])
        }
      } catch (error) {
        console.log('Error fetching claim tickets: ', error)
      }
    }

    if (eventId) {
      fetchClaimTickets()
    }
  }, [eventId])

  React.useEffect(() => {
    const generateQrCodes = async () => {
      const newQrCodes = await Promise.all(
        claimTickets.map((ticket) => QRCode.toDataURL(ticket.url)),
      )
      setQrCodes(newQrCodes)
    }

    generateQrCodes()
  }, [claimTickets])

  const onSubmit = async (data: FormData) => {
    try {
      const claimId = uuidv4()

      const { error } = await supabase.from('claims').insert({
        id: claimId,
        event_id: eventId,
        claim_end_date: data.claim_end_date,
      })

      if (error) {
        throw error
      }

      const proto = window.location.protocol
      const host = window.location.host
      const url = `${proto}//${host}/claim-ticket/${eventId}?claim_id=${claimId}`

      setClaimTickets((prevTickets) => [
        ...prevTickets,
        { url, endDate: data.claim_end_date },
      ])
    } catch (error) {
      console.log('Error setting claim end date: ', error)
    }
  }

  return (
    <Box as='form' onSubmit={handleSubmit(onSubmit)} p={4}>
      <FormControl isInvalid={!!errors.claim_end_date}>
        <FormLabel>Claim End Date</FormLabel>
        <Controller
          name='claim_end_date'
          control={control}
          defaultValue=''
          render={({ field }) => <Input type='date' {...field} />}
        />
        <FormErrorMessage>{errors.claim_end_date?.message}</FormErrorMessage>
      </FormControl>

      <Button colorScheme='blue' mt={4} type='submit' isLoading={isSubmitting}>
        Submit
      </Button>

      <Flex mt={4} flexWrap='wrap'>
        {qrCodes.map((qrCode, index) => (
          <Box key={index} width={['100%', '50%', '33.33%']} p={2}>
            <Image src={qrCode} alt='qr' width='200px' />
            <Button
              colorScheme='blue'
              mt={2}
              onClick={() => console.log('Expand QR code')}
            >
              QRコードを拡大する
            </Button>
            <Text mt={2}>期限：{claimTickets[index].endDate}</Text>
            <Text mt={2}>URL：{claimTickets[index].url}</Text>
          </Box>
        ))}
      </Flex>
    </Box>
  )
}

export default EventForm
