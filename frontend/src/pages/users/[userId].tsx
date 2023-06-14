import { GetServerSideProps } from 'next'
import React, { useState, useRef, ChangeEvent } from 'react'
import { useRouter } from 'next/router'
import NextLink from 'next/link'
import supabase from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthProvider'

import {
  Container,
  Stack,
  Button,
  Text,
  Heading,
  Divider,
  Link,
  Image,
  Icon,
  HStack,
  Flex,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Avatar,
  Input,
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
import type { Group, User } from '@/types'

interface UserDetailProps {
  user: User
}

export const getServerSideProps: GetServerSideProps<UserDetailProps> = async (
  context,
) => {
  const { userId } = context.query

  const { data: userData } = await supabase
    .from('users')
    .select(`*, groups(*)`)
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
    groups:
      userData.groups?.map((d: any) => ({
        id: d.id,
        name: d.name,
        contractAddress: d.contract_address,
        thumbnail: d.thumbnail,
      })) ?? [],
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
  console.log('authUser', authUser)
  const isAuthUser = user.id === authUser?.id
  const { isOpen, onOpen, onClose } = useDisclosure()

  const inputFileRef = useRef<HTMLInputElement>(null)
  const [userImage, setUserImage] = useState<File | null>(null)

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    file && setUserImage(file)
  }

  const saveImage = async () => {
    try {
      if (!authUser || !userImage) return

      const imageFilePath = `users/${authUser.id}/thumbnail.png`
      const { error: imageUploadError } = await supabase.storage
        .from('images')
        .upload(imageFilePath, userImage, {
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
          thumbnail: imagePublicUrl,
        })
        .eq('id', authUser.id)

      if (error) {
        console.error('Error inserting data:', error)
        return
      }
      toast({
        title: 'プロフィール画像を変更しました',
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
    <Container maxW='xl'>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>プロフィール編集</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              type='file'
              accept='image/*'
              style={{ display: 'none' }}
              ref={inputFileRef}
              onChange={handleImageChange}
            />
            <HStack justifyContent={'space-around'}>
              <Avatar
                src={
                  userImage
                    ? URL.createObjectURL(userImage)
                    : authUser?.thumbnail
                }
                size='xl'
              />

              <Button
                colorScheme='white'
                bg='black'
                rounded={'full'}
                onClick={() => inputFileRef.current?.click()}
              >
                画像を変更
              </Button>
            </HStack>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme='white'
              bg='black'
              onClick={async () => {
                await saveImage()
                onClose()
                fetchUser()
              }}
            >
              完了
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Stack spacing={4}>
        <HStack
          justifyContent={'space-between'}
          p={6}
          bg='white'
          rounded={'lg'}
        >
          <HStack>
            <Avatar
              src={isAuthUser ? authUser?.thumbnail : user.thumbnail}
              size='xl'
            />
            <Text>{isAuthUser ? authUser?.name : user.name}</Text>
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
        </HStack>

        <Heading as='h2' size='md'>
          所属グループ
        </Heading>
        <Flex gap={4} mt={6} flexWrap={'wrap'}>
          {user.groups?.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              textDecoration='none !important'
            >
              <Card maxW='sm' width='200px' borderRadius='lg'>
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
        </Flex>
      </Stack>
    </Container>
  )
}

export default UserDetail
