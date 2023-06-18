import { GetServerSideProps } from 'next'
import { MyHead } from '@/components/MyHead'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useForm, SubmitHandler } from 'react-hook-form'
import { useRouter } from 'next/router'
import { v4 as uuidv4 } from 'uuid'
import supabase from '@/lib/supabase'
import { useContract, useContractWrite } from '@thirdweb-dev/react'
import { CONTRACT_ADDRESSES } from '@/contracts/constants'
import GroupFactoryAbi from '@/contracts/GroupFactoryAbi.json'
import {
  FormControl,
  FormLabel,
  Stack,
  HStack,
  Button,
  Input,
  Image,
  Box,
  useToast,
} from '@chakra-ui/react'
import { useAuth } from '@/contexts/AuthProvider'
import { COOKIE } from '@/constants'
import { isTokenExpired } from '@/utils'
import { getEventFromReceipt } from '@/utils'

interface NewGroupProps {}

export const getServerSideProps: GetServerSideProps<NewGroupProps> = async (
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

const NewGroup = () => {
  const toast = useToast()
  const router = useRouter()
  const { user, authSignIn } = useAuth()

  const { contract } = useContract(
    CONTRACT_ADDRESSES.GroupFactory,
    GroupFactoryAbi,
  )

  const schema = z.object({
    name: z.string().nonempty({ message: 'Required' }),
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

  const currentImage = watch('image')

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!user) return
    try {
      const groupId = uuidv4()

      const imageFilePath = `images/groups/${groupId}/membership.png`
      const { error: imageUploadError } = await supabase.storage
        .from('metadata')
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
      } = await supabase.storage.from('metadata').getPublicUrl(imageFilePath)
      console.log('imagePublicUrl', imagePublicUrl)

      const groupData = {
        name: `${data.name} membership NFT`,
        description: `about ${data.name} membership`,
        image: imagePublicUrl,
        attributes: [
          {
            trait_type: 'メンバータイプ',
            value: '運営メンバー',
          },
          {
            trait_type: '役割',
            value: 'エンジニア',
          },
        ],
      }

      const jsonFilePath = `json/groups/${groupId}/membership.json`
      const { error: jsonUploadError } = await supabase.storage
        .from('metadata')
        .upload(
          jsonFilePath,
          new Blob([JSON.stringify(groupData)], { type: 'application/json' }),
          { contentType: 'application/json' },
        )

      if (jsonUploadError) {
        console.error('Error uploading JSON:', jsonUploadError)
        return
      }

      const {
        data: { publicUrl: jsonPublicUrl },
      } = supabase.storage.from('metadata').getPublicUrl(jsonFilePath)

      console.log('jsonPublicUrl', jsonPublicUrl)

      const { receipt } = await mutateCreateGroup({
        args: [groupId, jsonPublicUrl],
      })
      const event = getEventFromReceipt(receipt, 'GroupCreated')

      if (!event) {
        // TODO:
        console.log('error')
        return
      }

      const groupAddress = event.args._groupAddress

      const { error } = await supabase.from('groups').insert({
        id: groupId,
        name: data.name,
        contract_address: groupAddress,
        created_user_id: user.id,
        thumbnail: imagePublicUrl,
      })

      if (error) {
        console.error('Error inserting data:', error)
        return
      }

      const { error: error2 } = await supabase
        .from('members')
        .insert({ group_id: groupId, user_id: user.id })

      if (error2) {
        console.error('Error inserting data:', error2)
      }

      router.push(`/groups/${groupId}`)
    } catch (e) {
      console.log('e', e)
    }
  }

  const { mutateAsync: mutateCreateGroup, error } = useContractWrite(
    contract,
    'createGroup',
  )

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

  return (
    <>
      <MyHead title='グループ作成' />
      <Stack as='form' onSubmit={handleSubmit(onSubmit)} spacing={4}>
        <FormControl id='name'>
          <FormLabel>Name</FormLabel>
          <Input {...register('name')} />
          {errors.name && <span>{errors.name.message}</span>}
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
                  alt='グループ画像'
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
          グループを作成
        </Button>
      </Stack>

      {/* <Stack>
        <Input
          placeholder='グループ名'
          value={groupName}
          onChange={handleNameChange}
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
          {groupImage ? (
            <Image
              src={URL.createObjectURL(groupImage)}
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
          onClick={createGroup}
          isLoading={isLoading}
          colorScheme='purple'
          isDisabled={!groupName || !groupImage}
        >
          グループを作成
        </Button>
      </Stack> */}
    </>
  )
}

export default NewGroup
