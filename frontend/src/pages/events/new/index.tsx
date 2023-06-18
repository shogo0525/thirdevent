import { GetServerSideProps } from 'next'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useForm, SubmitHandler } from 'react-hook-form'
import { useRouter } from 'next/router'
import { v4 as uuidv4 } from 'uuid'
import supabase from '@/lib/supabase'
import { useContract, useContractWrite } from '@thirdweb-dev/react'
import GroupAbi from '@/contracts/GroupAbi.json'
import {
  FormControl,
  FormLabel,
  Stack,
  HStack,
  Button,
  Text,
  Input,
  Image,
  useToast,
  Select,
  Box,
  Textarea,
} from '@chakra-ui/react'
import { useAuth } from '@/contexts/AuthProvider'
import { COOKIE } from '@/constants'
import { isTokenExpired } from '@/utils'
import { getEventFromReceipt } from '@/utils'

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
  const { user, authSignIn } = useAuth()

  const schema = z.object({
    groupId: z.string().nonempty({ message: 'Required' }),
    title: z.string().nonempty({ message: 'Required' }),
    description: z.string().nonempty({ message: 'Required' }),
    image: z
      .custom<FileList>()
      .refine((file) => file.length !== 0, { message: 'Required' }),
    // .transform((file) => file[0]),
  })

  type FormData = z.infer<typeof schema>

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const currentGroupId = watch('groupId')
  const selectedGroup = user?.groups?.find((g) => g.id === currentGroupId)
  const currentImage = watch('image')

  const { contract: groupContract } = useContract(
    selectedGroup?.contractAddress,
    GroupAbi,
  )

  const { mutateAsync: mutateCreateEvent } = useContractWrite(
    groupContract,
    'createEvent',
  )

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const eventId = uuidv4()

      const imageFilePath = `events/${eventId}/thumbnail.png`
      const { error: imageUploadError } = await supabase.storage
        .from('images')
        .upload(imageFilePath, data.image[0])

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

      const event = getEventFromReceipt(receipt, 'EventCreated')

      if (!event) {
        console.log('error')
        return
      }

      const eventAddress = event.args[1]

      const { error } = await supabase.from('events').insert({
        id: eventId,
        group_id: data.groupId,
        contract_address: eventAddress,
        title: data.title,
        description: data.description,
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

  console.log(errors)

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

  if (!user.groups || user.groups.length === 0) {
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
    <Stack as='form' onSubmit={handleSubmit(onSubmit)} spacing={4}>
      <FormControl id='groupId'>
        <FormLabel>Group</FormLabel>
        <Select {...register('groupId')} placeholder='グループを選択'>
          {user.groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
        {errors.groupId && <span>{errors.groupId.message}</span>}
      </FormControl>

      <FormControl id='title'>
        <FormLabel>Title</FormLabel>
        <Input {...register('title')} />
        {errors.title && <span>{errors.title.message}</span>}
      </FormControl>

      <FormControl id='description'>
        <FormLabel>description</FormLabel>
        <Textarea {...register('description')} />
        {errors.description && <span>{errors.description.message}</span>}
      </FormControl>

      <FormControl id='image'>
        <HStack justifyContent={'space-between'}>
          <Stack>
            <FormLabel
              bg='black'
              color='white'
              p={3}
              borderRadius={'full'}
              w={110}
            >
              画像を選択
              <Input type='file' hidden {...register('image')} />
            </FormLabel>
            {errors.image && <span>{errors.image.message}</span>}
          </Stack>

          <Box
            width='100%'
            height={{ base: '200px', md: '300px' }}
            bgColor={'gray.200'}
          >
            {currentImage?.length > 0 ? (
              <Image
                src={URL.createObjectURL(currentImage[0])}
                alt='イベント画像'
                width='100%'
                height={{ base: '200px', md: '300px' }}
                objectFit={'cover'}
              />
            ) : (
              ''
            )}
          </Box>
        </HStack>
      </FormControl>

      <Button
        type='submit'
        colorScheme='white'
        bg='black'
        mt={10}
        isLoading={isSubmitting}
        isDisabled={Object.entries(errors).length !== 0}
      >
        イベントを作成
      </Button>
    </Stack>
  )
}

export default NewEvent
