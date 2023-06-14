import { GetServerSideProps } from 'next'
import Head from 'next/head'
import NextLink from 'next/link'
import { useState, useRef, ChangeEvent } from 'react'
import { useRouter } from 'next/router'
import { v4 as uuidv4 } from 'uuid'
import supabase from '@/lib/supabase'
import { useContract, useContractWrite } from '@thirdweb-dev/react'
import GroupAbi from '@/contracts/GroupAbi.json'
import {
  Stack,
  HStack,
  Button,
  Text,
  Input,
  Image,
  useToast,
  Select,
} from '@chakra-ui/react'
import { useAuth } from '@/contexts/AuthProvider'
import { COOKIE } from '@/constants'
import { isTokenExpired } from '@/utils'

interface NewEventProps {}

export const getServerSideProps: GetServerSideProps<NewEventProps> = async (
  context,
) => {
  // TODO: 共通化
  const tokenExpiration = context.req.cookies[COOKIE.TOKEN_EXPIRATION]
  if (isTokenExpired(tokenExpiration)) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    }
  }

  return {
    props: {},
  }
}

const NewEvent = () => {
  const toast = useToast()
  const router = useRouter()
  const { user } = useAuth()

  const [eventTitle, setEventTitle] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const inputFileRef = useRef<HTMLInputElement>(null)
  const [eventImage, setEventImage] = useState<File | null>(null)

  const selectedGroup = user?.groups?.find((g) => g.id === selectedGroupId)

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGroupId(e.target.value)
  }

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEventTitle(event.target.value)
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    file && setEventImage(file)
  }

  const handleUploadClick = () => {
    inputFileRef.current?.click()
  }

  const { contract: groupContract } = useContract(
    selectedGroup?.contractAddress,
    GroupAbi,
  )

  const { mutateAsync: mutateCreateEvent, isLoading } = useContractWrite(
    groupContract,
    'createEvent',
  )

  const createEvent = async () => {
    try {
      if (!user || !eventImage || !selectedGroup) return
      const eventId = uuidv4()

      const imageFilePath = `events/${eventId}/thumbnail.png`
      const { error: imageUploadError } = await supabase.storage
        .from('images')
        .upload(imageFilePath, eventImage)

      if (imageUploadError) {
        console.error('Error uploading image:', imageUploadError)
        toast({
          title: 'Error uploading image.',
          description: imageUploadError.message,
          status: 'error',
          duration: 9000,
          position: 'top',
          isClosable: true,
        })
        return
      }

      const {
        data: { publicUrl: imagePublicUrl },
      } = await supabase.storage.from('images').getPublicUrl(imageFilePath)
      console.log('imagePublicUrl', imagePublicUrl)

      const { receipt } = await mutateCreateEvent({
        args: [eventId],
      })
      const eventAddress = (receipt as any).events[0].address

      const { error } = await supabase.from('events').insert({
        id: eventId,
        group_id: selectedGroup.id,
        contract_address: eventAddress,
        title: eventTitle,
        thumbnail: imagePublicUrl,
      })

      if (error) {
        console.error('Error inserting data:', error)
      }

      router.push(`/events/${eventId}`)
    } catch (e) {
      console.log('e', e)
    }
  }

  if (user?.groups?.length === 0) {
    return (
      <HStack mb={20}>
        <Text fontSize={'xl'} fontWeight={'bold'}>
          まずはグループを作成しましょう！
        </Text>
        <Button onClick={() => router.push('/groups/new')}>グループ作成</Button>
      </HStack>
    )
  }

  return (
    <Stack>
      {user?.groups && user.groups.length > 0 && (
        <Select
          value={selectedGroupId}
          onChange={handleGroupChange}
          placeholder='グループを選択'
        >
          {user.groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
      )}
      <Input
        placeholder='イベント名'
        value={eventTitle}
        onChange={handleTitleChange}
      />
      <Input
        type='file'
        accept='image/*'
        style={{ display: 'none' }}
        ref={inputFileRef}
        onChange={handleImageChange}
      />
      <Button
        borderRadius='none'
        p={0}
        width='100%'
        height={{ base: '200px', md: '300px' }}
        bgColor={'gray.200'}
        onClick={handleUploadClick}
      >
        {eventImage ? (
          <Image
            src={URL.createObjectURL(eventImage)}
            alt='選択された画像'
            width='100%'
            height='100%'
            objectFit='cover'
          />
        ) : (
          '画像を選択'
        )}
      </Button>
      <Button
        onClick={createEvent}
        isLoading={isLoading}
        colorScheme='purple'
        isDisabled={!eventTitle || !eventImage || !selectedGroup}
      >
        イベントを作成
      </Button>
    </Stack>
  )
}

export default NewEvent
