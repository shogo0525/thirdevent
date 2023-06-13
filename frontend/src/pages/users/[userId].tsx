import { GetServerSideProps } from 'next'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import NextLink from 'next/link'
import supabase from '@/lib/supabase'
import { ethers } from 'ethers'
import {
  useSDK,
  Web3Button,
  useAddress,
  useContract,
  useContractRead,
  useContractWrite,
  useContractEvents,
} from '@thirdweb-dev/react'
import EventAbi from '@/contracts/EventAbi.json'
import GroupAbi from '@/contracts/GroupAbi.json'

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
  return (
    <Container maxW='lg'>
      <Stack spacing={4}>
        {/* TODO: component化(Headerと) */}
        <HStack>
          {user.thumbnail ? (
            <Image
              src={user.thumbnail}
              alt={user.name}
              borderRadius='full'
              boxSize='80px'
              objectFit='cover'
            />
          ) : (
            <Icon
              viewBox='0 0 24 24'
              boxSize='80px'
              borderWidth='1px'
              borderColor='gray.300'
              borderRadius='full'
            >
              <circle
                cx='12'
                cy='7'
                r='4'
                stroke='currentColor'
                fill='none'
                strokeWidth='2'
              />
              <path
                stroke='currentColor'
                fill='none'
                strokeWidth='2'
                d='M8 14a8 8 0 1 0 8 0z'
              />
            </Icon>
          )}
          <Text>{user.name}</Text>
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
