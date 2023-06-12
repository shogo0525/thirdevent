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
} from '@chakra-ui/react'
import type { Group } from '@/types'

interface UserDetailProps {
  userAddress: string
  groups: Group[]
}

export const getServerSideProps: GetServerSideProps<UserDetailProps> = async (
  context,
) => {
  const { userAddress } = context.query

  const { data } = await supabase
    .from('group_member')
    .select(
      `
        *,
        group:groups(*)
      `,
    )
    .eq('member_address', userAddress)

  const groups: Group[] =
    data?.map((d) => ({
      id: d.group.id,
      name: d.group.name,
      contractAddress: d.group.contract_address,
    })) ?? []

  return {
    props: {
      userAddress: userAddress as string,
      groups,
    },
  }
}

const UserDetail = ({ userAddress, groups }: UserDetailProps) => {
  return (
    <Container maxW='lg'>
      <Stack spacing={4}>
        <Heading as='h2'>ユーザー詳細</Heading>
        <Text>User Address: {userAddress}</Text>

        <Heading as='h2'>所属グループ</Heading>
        {groups.map((g) => (
          <Link
            as={NextLink}
            key={g.id}
            color='teal.500'
            href={`/groups/${g.id}`}
          >
            {g.name}
          </Link>
        ))}
      </Stack>
    </Container>
  )
}

export default UserDetail
