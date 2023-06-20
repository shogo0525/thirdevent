import { GetServerSideProps } from 'next'
import React from 'react'
import { MyHead } from '@/components/MyHead'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useForm, SubmitHandler } from 'react-hook-form'
import supabase from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthProvider'
import {
  FormControl,
  FormLabel,
  Container,
  Stack,
  Button,
  Text,
  Heading,
  Link,
  Image,
  HStack,
  Card,
  CardBody,
  Avatar,
  Input,
  Flex,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import type { User } from '@/types'

interface UserDetailProps {
  user: User
}

export const getServerSideProps: GetServerSideProps<UserDetailProps> = async (
  context,
) => {
  const { userId } = context.query

  const { data: userData } = await supabase
    .from('users')
    .select(`*, groups(*), participants(*, event:events(*))`)
    .eq('id', userId)
    .maybeSingle()

  if (!userData) {
    return {
      notFound: true,
    }
  }

  const user: User = {
    id: userData.id,
    walletAddress: userData.wallet_address,
    name: userData.name,
    thumbnail: userData.thumbnail,
    events: (userData.participants ?? []).map((p: any) => ({
      id: p.event.id,
      title: p.event.title,
      contractAddress: p.event.contract_address,
      thumbnail: p.event.thumbnail,
    })),
    groups: (userData.groups ?? []).map((d: any) => ({
      id: d.id,
      name: d.name,
      contractAddress: d.contract_address,
      thumbnail: d.thumbnail,
    })),
  }

  return {
    props: {
      user,
    },
  }
}

const UserDetail = ({ user }: UserDetailProps) => {
  const toast = useToast()
  const { user: authUser, fetchUser } = useAuth()

  const isAuthUser = user.id === authUser?.id
  const { isOpen, onOpen, onClose } = useDisclosure()

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
  const inputImageRef = React.useRef<HTMLInputElement | null>(null)
  const { ref: imageFieldRef, ...imageRest } = register('image')

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      if (!authUser) return

      const imageFilePath = `users/${authUser.id}/thumbnail.png`
      const { error: imageUploadError } = await supabase.storage
        .from('images')
        .upload(imageFilePath, data.image[0], {
          upsert: true,
        })

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

      const { error } = await supabase
        .from('users')
        .update({
          name: data.name,
          thumbnail: imagePublicUrl,
        })
        .eq('id', authUser.id)

      if (error) {
        console.error('Error inserting data:', error)
        return
      }

      onClose()
      fetchUser()

      toast({
        title: 'プロフィールを変更しました',
        status: 'success',
        duration: 9000,
        position: 'top',
        isClosable: true,
      })
    } catch (e) {
      console.log('e', e)
    }
  }

  return (
    <>
      <MyHead title={user.name} />
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>プロフィール編集</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack as='form' onSubmit={handleSubmit(onSubmit)} spacing={4}>
              <FormControl id='name'>
                <FormLabel>Name</FormLabel>
                <Input defaultValue={authUser?.name} {...register('name')} />
                {errors.name && <span>This field is required</span>}
              </FormControl>

              <FormControl id='image'>
                <FormLabel>Image</FormLabel>
                <Input
                  type='file'
                  hidden
                  {...imageRest}
                  ref={(e) => {
                    imageFieldRef(e)
                    inputImageRef.current = e
                  }}
                />
                <HStack justifyContent={'space-around'}>
                  <Button
                    colorScheme='white'
                    bg='black'
                    rounded={'full'}
                    onClick={() => inputImageRef.current?.click()}
                  >
                    画像を選択
                  </Button>
                  {errors.image && <span>This field is required</span>}

                  <Avatar
                    src={
                      currentImage?.length > 0
                        ? URL.createObjectURL(currentImage[0])
                        : authUser?.thumbnail
                    }
                    size='2xl'
                  />
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
                完了
              </Button>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Container maxW='2xl'>
        <Stack spacing={4}>
          <Flex
            justifyContent={'space-between'}
            alignItems={'center'}
            flexDirection={{
              base: 'column',
              sm: 'row',
            }}
            p={4}
            gap={4}
            bg='white'
            rounded={'lg'}
          >
            <HStack spacing={3}>
              <Avatar
                src={isAuthUser ? authUser?.thumbnail : user.thumbnail}
                size={{ base: 'xl', sm: '2xl' }}
              />
              <Text fontSize={'xl'}>
                {isAuthUser ? authUser?.name : user.name}
              </Text>
            </HStack>
            {isAuthUser ? (
              <Button
                colorScheme='white'
                bg='black'
                rounded={'full'}
                onClick={onOpen}
              >
                プロフィール編集
              </Button>
            ) : (
              <Button colorScheme='white' bg='black' rounded={'full'}>
                フォロー
              </Button>
            )}
          </Flex>

          <Heading as='h2' size='md' mt={2}>
            参加イベント
          </Heading>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
            {user.events?.map((e, i) => (
              <Link
                // TODO
                key={e.id + i}
                href={`/events/${e.id}`}
                textDecoration='none !important'
              >
                <Card borderRadius='lg'>
                  <CardBody p={0}>
                    <Image
                      src={e.thumbnail}
                      alt={e.title}
                      borderTopRadius='lg'
                      boxSize={'150px'}
                      width='100%'
                      objectFit='cover'
                    />
                    <Stack mt={2} spacing={3} p={2}>
                      <Text
                        fontSize='sm'
                        fontWeight='bold'
                        noOfLines={2}
                        height='40px'
                      >
                        {e.title}
                      </Text>
                    </Stack>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </SimpleGrid>

          <Heading as='h2' size='md' mt={2}>
            所属グループ
          </Heading>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
            {user.groups?.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                textDecoration='none !important'
              >
                <Card borderRadius='lg'>
                  <CardBody p={0}>
                    <Image
                      src={g.thumbnail}
                      alt={g.name}
                      borderTopRadius='lg'
                      boxSize={'150px'}
                      width='100%'
                      objectFit='cover'
                    />
                    <Stack mt={2} spacing={3} p={2}>
                      <Text
                        fontSize='sm'
                        fontWeight='bold'
                        noOfLines={2}
                        height='40px'
                      >
                        {g.name}
                      </Text>
                    </Stack>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </>
  )
}

export default UserDetail
