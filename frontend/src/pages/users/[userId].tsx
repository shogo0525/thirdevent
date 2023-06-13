import { GetServerSideProps } from 'next'
import React, { useState, useEffect } from 'react'
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
  const { user: authUser } = useAuth()
  return (
    <Container maxW='lg'>
      <Stack spacing={4}>
        <HStack
          justifyContent={'space-between'}
          p={6}
          bg='white'
          rounded={'lg'}
        >
          <HStack>
            <Avatar src={user.thumbnail} size='xl' />
            <Text>{user.name}</Text>
          </HStack>
          {user.id === authUser?.id ? (
            <Button colorScheme='white' bg='black' rounded={'full'}>
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
