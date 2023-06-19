import { GetServerSideProps } from 'next'
import React from 'react'
import { MyHead } from '@/components/MyHead'
import { useForm, Controller } from 'react-hook-form'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useContract,
  useContractRead,
  useContractWrite,
} from '@thirdweb-dev/react'
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
  Heading,
  SimpleGrid,
  HStack,
  useToast,
} from '@chakra-ui/react'
import { thirdwebSDK } from '@/lib/thirdwebSDK'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { v4 as uuidv4 } from 'uuid'
import supabase from '@/lib/supabase'
import QRCode from 'qrcode'
import EventAbi from '@/contracts/EventAbi.json'
import GroupAbi from '@/contracts/GroupAbi.json'
import type { Event } from '@/types'
import { useAuth } from '@/contexts/AuthProvider'

type ClaimUrl = {
  url: string
  endDate: string
  qrCode: string
}

interface AdminEventProps {
  event: Event
  splitContractAddress: string
  claimUrlList: ClaimUrl[]
}

export const getServerSideProps: GetServerSideProps<AdminEventProps> = async (
  context,
) => {
  const { eventId } = context.query
  const { host, 'x-forwarded-proto': proto } = context.req.headers

  const { data: eventData } = await supabase
    .from('events')
    .select('*, group:groups(*), claims(*)')
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

  const eventContract = await thirdwebSDK.getContract(
    event.contractAddress,
    EventAbi,
  )
  const splitContractAddress: string = await eventContract.call(
    'splitContractAddress',
  )

  const claimUrlList: ClaimUrl[] = await Promise.all(
    (eventData.claims ?? []).map(async (d: any) => {
      const url = `${proto}://${host}/claim-ticket/${eventData.id}?claimId=${d.id}`
      const endDate = d.claim_end_date as string
      const qrCode = await QRCode.toDataURL(url)

      return { url, endDate, qrCode }
    }),
  )

  return {
    props: { event, splitContractAddress, claimUrlList },
  }
}

const schema = z.object({
  claim_end_date: z.string(),
})

export type FormData = z.infer<typeof schema>

const AdminEvent = ({
  event,
  splitContractAddress,
  claimUrlList: initialClaimUrlList,
}: AdminEventProps) => {
  const { authSignIn, user } = useAuth()
  const toast = useToast()
  const router = useRouter()

  const [currentSplitAddress, setCurrentSplitAddress] =
    React.useState(splitContractAddress)
  const [splitAddress, setSplitAddress] = React.useState('')

  const { contract: groupContract } = useContract(
    event.group.contractAddress,
    GroupAbi,
  )

  const { data: groupNftCount } = useContractRead(groupContract, 'balanceOf', [
    user?.walletAddress,
  ])

  const isGroupMember = Number(groupNftCount) > 0 && user

  const { mutateAsync: mutateSetSplitAddress, isLoading } = useContractWrite(
    groupContract,
    'setSplitContractAddress',
  )

  const updateSplitAddress = async () => {
    if (!splitAddress) return

    try {
      await mutateSetSplitAddress({
        args: [event.contractAddress, splitAddress],
      })
      setCurrentSplitAddress(splitAddress)
      toast({
        title: '設定が完了しました',
        status: 'success',
        duration: 9000,
        position: 'top',
        isClosable: true,
      })
    } catch (e) {
      console.log(e)
    }
  }

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
        event_id: event.id,
        claim_end_date: data.claim_end_date,
      })

      if (error) {
        throw error
      }

      const { protocol, host } = window.location
      const url = `${protocol}//${host}/claim-ticket/${event.id}?claimId=${claimId}`
      const qrCode = await QRCode.toDataURL(url)

      setClaimUrlList((prev) => [
        ...prev,
        { url, endDate: data.claim_end_date, qrCode },
      ])
    } catch (error) {
      console.log('Error setting claim end date: ', error)
    }
  }

  if (!user) {
    return (
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
    )
  }

  if (!isGroupMember) {
    return <Text>グループメンバーではありません</Text>
  }

  return (
    <>
      <MyHead title={`${event.title} 管理ページ`} />
      <Stack>
        <Button
          as={NextLink}
          href={`/events/${event.id}`}
          colorScheme='white'
          bg='black'
          rounded={'full'}
          w='fit-content'
        >
          イベントページへ戻る
        </Button>
        <Heading as='h2' size='lg' mt={6}>
          売上の分配設定
        </Heading>
        <Stack>
          <Text fontWeight={'bold'}>
            現在設定中のSplitコントラクト: {currentSplitAddress}
          </Text>
          <HStack>
            <Text fontSize='lg'>
              STEP1: thirdwebでSplitコントラクトを作成する
            </Text>
            <Link
              as={NextLink}
              color='teal.500'
              href={'https://thirdweb.com/thirdweb.eth/Split'}
              target={'_blank'}
            >
              <Flex alignItems='center' gap={1}>
                thirdweb
                <ExternalLinkIcon color='teal.500' />
              </Flex>
            </Link>
          </HStack>
          <Text fontSize='lg'>
            STEP2: 作成したSplitコントラクトのアドレスを入力し、設定ボタンを押す
          </Text>

          <Input
            placeholder='Splitコントラクトアドレス'
            // value={newMember?.walletAddress}
            onChange={(e) => setSplitAddress(e.target.value)}
          />
          <Button
            colorScheme='teal'
            size='sm'
            color='white'
            onClick={updateSplitAddress}
            isDisabled={!splitAddress}
            w='fit-content'
          >
            設定
          </Button>
        </Stack>

        <Heading as='h2' size='lg' mt={6}>
          QRコードの発行
        </Heading>
        <Stack as='form' onSubmit={handleSubmit(onSubmit)} p={4} spacing={4}>
          <FormControl isInvalid={!!errors.claim_end_date}>
            <FormLabel>QRの有効期限</FormLabel>
            <Controller
              name='claim_end_date'
              control={control}
              defaultValue=''
              render={({ field }) => <Input type='date' {...field} />}
            />
            <FormErrorMessage>
              {errors.claim_end_date?.message}
            </FormErrorMessage>
          </FormControl>

          <Button
            colorScheme='teal'
            type='submit'
            isLoading={isSubmitting}
            w='fit-content'
          >
            発行
          </Button>

          <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
            {claimUrlList.map((claimUrl, index) => (
              <Stack key={index}>
                <Image src={claimUrl.qrCode} alt='qr' width='100%' />
                <HStack>
                  <Text>期限: {claimUrl.endDate}</Text>
                  <Link
                    as={NextLink}
                    color='teal.500'
                    href={claimUrl.url}
                    target='_blank'
                    textDecoration='none !important'
                  >
                    リンク
                  </Link>
                </HStack>
              </Stack>
            ))}
          </SimpleGrid>
        </Stack>
      </Stack>
    </>
  )
}

export default AdminEvent
