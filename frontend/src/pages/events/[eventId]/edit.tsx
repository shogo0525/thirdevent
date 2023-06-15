import { GetServerSideProps } from 'next'
import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import NextLink from 'next/link'
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
  Link,
  Stack,
} from '@chakra-ui/react'
import { v4 as uuidv4 } from 'uuid'
import supabase from '@/lib/supabase'
import QRCode from 'qrcode'

type ClaimUrl = {
  url: string
  endDate: string
  qrCode: string
}

interface EditEventProps {
  eventId: string
  claimUrlList: ClaimUrl[]
}

export const getServerSideProps: GetServerSideProps<EditEventProps> = async (
  context,
) => {
  const { eventId } = context.query
  const { host, 'x-forwarded-proto': proto } = context.req.headers

  const { data: claimData } = await supabase
    .from('claims')
    .select('*')
    .eq('event_id', eventId)

  const claimUrlList: ClaimUrl[] = await Promise.all(
    (claimData ?? []).map(async (d) => {
      const url = `${proto}://${host}/claim-ticket/${eventId}?claimId=${d.id}`
      const endDate = d.claim_end_date as string
      const qrCode = await QRCode.toDataURL(url)

      return { url, endDate, qrCode }
    }),
  )

  return {
    props: { eventId: eventId as string, claimUrlList },
  }
}

const schema = z.object({
  claim_end_date: z.string(),
})

export type FormData = z.infer<typeof schema>

const EditEvent = ({
  eventId,
  claimUrlList: initialClaimUrlList,
}: EditEventProps) => {
  const [claimUrlList, setClaimUrlList] =
    React.useState<ClaimUrl[]>(initialClaimUrlList)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

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

      const { protocol, host } = window.location
      const url = `${protocol}://${host}/claim-ticket/${eventId}?claimId=${claimId}`
      const qrCode = await QRCode.toDataURL(url)

      setClaimUrlList((prevTickets) => [
        ...prevTickets,
        { url, endDate: data.claim_end_date, qrCode },
      ])
    } catch (error) {
      console.log('Error setting claim end date: ', error)
    }
  }

  return (
    <Stack as='form' onSubmit={handleSubmit(onSubmit)} p={4} spacing={4}>
      <FormControl isInvalid={!!errors.claim_end_date}>
        <FormLabel>参加確定の期限日</FormLabel>
        <Controller
          name='claim_end_date'
          control={control}
          defaultValue=''
          render={({ field }) => <Input type='date' {...field} />}
        />
        <FormErrorMessage>{errors.claim_end_date?.message}</FormErrorMessage>
      </FormControl>

      <Button colorScheme='blue' type='submit' isLoading={isSubmitting}>
        Submit
      </Button>

      <Flex flexWrap='wrap'>
        {claimUrlList.map((claimUrl, index) => (
          <Box key={index} width={{ base: '100%', md: '50%' }} p={2}>
            <Image src={claimUrl.qrCode} alt='qr' width='100%' />
            <Text mt={2}>期限: {claimUrl.endDate}</Text>
            <Link
              as={NextLink}
              color='teal.500'
              href={claimUrl.url}
              textDecoration='none !important'
            >
              リンク
            </Link>
            <Text mt={2}>URL: {claimUrl.url}</Text>
          </Box>
        ))}
      </Flex>
    </Stack>
  )
}

export default EditEvent
