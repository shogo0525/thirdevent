import { GetServerSideProps } from 'next'
import React, { useState, useEffect, ChangeEvent } from 'react'
import { useRouter } from 'next/router'
import NextLink from 'next/link'
import supabase from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import { ethers } from 'ethers'
import {
  useAddress,
  useContract,
  useContractRead,
  useContractWrite,
} from '@thirdweb-dev/react'
import { ThirdwebSDK } from '@thirdweb-dev/sdk'
import GroupAbi from '@/contracts/GroupAbi.json'
import {
  Container,
  Flex,
  Stack,
  Button,
  Text,
  Heading,
  Link,
  Input,
  Divider,
  Grid,
  GridItem,
  Image,
  Card,
  CardBody,
  Avatar,
  HStack,
} from '@chakra-ui/react'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { truncateContractAddress } from '@/utils'
import type { Group } from '@/types'
import { COOKIE } from '@/constants'

interface GroupDetailProps {
  userId: string
  group: Group
}

export const getServerSideProps: GetServerSideProps<GroupDetailProps> = async (
  context,
) => {
  const { groupId } = context.query
  const userId = context.req.cookies[COOKIE.USER_ID] ?? ''
  console.log('userId', userId)

  const { data: groupData } = await supabase
    .from('groups')
    .select(
      `
        *,
        users(*),
        events(*)
      `,
    )
    .eq('id', groupId)
    .maybeSingle()
  // console.log(groupData)

  if (!groupData) {
    return {
      notFound: true,
    }
  }

  // TODO: constants
  const sdk = new ThirdwebSDK('mumbai')
  const balance = await sdk.getBalance(groupData.contract_address)

  const group: Group = {
    id: groupData.id,
    contractAddress: groupData.contract_address,
    balance: balance.displayValue,
    name: groupData.name,
    subtitle: groupData.subtitle,
    thumbnail: groupData.thumbnail,
    members: groupData.users?.map((u: any) => ({
      id: u.id,
      name: u.name,
      walletAddress: u.wallet_address,
      thumbnail: u.thumbnail,
    })),
    events: groupData.events.map((e: any) => ({
      id: e.id,
      groupId,
      title: e.title,
    })),
  }
  console.log(group)

  return {
    props: {
      userId,
      group,
    },
  }
}

const GroupDetail = ({ group }: GroupDetailProps) => {
  const router = useRouter()
  const address = useAddress()
  const { contract: groupContract } = useContract(
    group.contractAddress,
    GroupAbi,
  )

  // address が Group の NFT をいくつ所有しているかを取得
  // TODO: can be refactored
  const { data: groupNftCount } = useContractRead(groupContract, 'balanceOf', [
    address,
  ])
  const isGroupMember = Number(groupNftCount) > 0

  const [newMemberAddress, setNewMemberAddress] = useState('')
  const handleMemberAddressChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNewMemberAddress(event.target.value)
  }

  const { mutateAsync: mutateAddMember, isLoading: isAddingMember } =
    useContractWrite(groupContract, 'addMember')
  const addMember = async () => {
    try {
      const { receipt } = await mutateAddMember({
        args: [newMemberAddress],
      })
      console.log('receipt', receipt)
      const { error } = await supabase
        .from('group_member')
        .insert({ group_id: group.id, member_address: newMemberAddress })

      if (error) {
        console.error('Error inserting data:', error)
      }
    } catch (e) {
      console.log('e', e)
    }
  }

  const groupData = [
    {
      label: 'グループ名',
      content: group.name,
    },
    {
      label: 'コントラクトアドレス',
      content: truncateContractAddress(group.contractAddress),
      href: `https://mumbai.polygonscan.com/address/${group.contractAddress}`,
      target: '_blank',
    },
  ]
  if (isGroupMember) {
    groupData.push({
      label: '残高',
      content: `${group.balance} Matic`,
    })
  }

  console.log('groupData', groupData)

  return (
    <Grid templateColumns={{ base: '100%', md: '65% 35%' }} gap={4}>
      <GridItem>
        <Stack spacing={4}>
          <Image
            src={group.thumbnail}
            alt={group.subtitle}
            width='100%'
            height={{ base: '200px', md: '300px' }}
            objectFit='cover'
            borderRadius='lg'
          />
          <Heading as='h2' size='lg'>
            {group.name}
          </Heading>
          <Heading as='h3' size='md'>
            {group.subtitle}
          </Heading>

          <Text>イベント一覧</Text>
          {group.events?.map((e) => (
            <Link
              as={NextLink}
              key={e.id}
              color='teal.500'
              href={`/events/${e.id}`}
            >
              {e.title}
            </Link>
          ))}
        </Stack>
      </GridItem>
      <GridItem>
        <Stack spacing={4}>
          <Card borderRadius='lg'>
            <CardBody p={0}>
              <Stack mt={2} spacing={3} p={3}>
                {groupData.map(({ label, content, href, target }, i) => {
                  return (
                    <React.Fragment key={i}>
                      <Stack direction='row' justifyContent='space-between'>
                        {label && (
                          <Text size='md' fontWeight='bold'>
                            {label}
                          </Text>
                        )}
                        {content && (
                          <>
                            {href ? (
                              <Link
                                as={NextLink}
                                color='teal.500'
                                href={href}
                                target={target ?? '_self'}
                              >
                                <Flex alignItems='center' gap={1}>
                                  {content}
                                  {target === '_blank' && (
                                    <ExternalLinkIcon color='teal.500' />
                                  )}
                                </Flex>
                              </Link>
                            ) : (
                              <Text size='md'>{content}</Text>
                            )}
                          </>
                        )}
                      </Stack>

                      {i !== groupData.length - 1 && <Divider />}
                    </React.Fragment>
                  )
                })}
              </Stack>
            </CardBody>
          </Card>

          <Heading fontSize={'md'}>グループメンバー</Heading>
          {group.members?.map((user) => (
            <Link
              as={NextLink}
              key={user.id}
              color='teal.500'
              href={`/users/${user.id}`}
            >
              <HStack>
                <Avatar src={user.thumbnail} size='sm' />
                <Text>{user.name}</Text>
              </HStack>
            </Link>
          ))}

          {isGroupMember && (
            <>
              <Divider />
              <Heading fontSize={'md'}>グループメンバー向け機能</Heading>

              <Button
                colorScheme='white'
                bg='black'
                rounded={'full'}
                onClick={() => router.push('/events/new')}
              >
                イベントを作成
              </Button>

              <Input
                placeholder='Enter Member Address'
                value={newMemberAddress}
                onChange={handleMemberAddressChange}
              />
              <Button
                isLoading={isAddingMember}
                onClick={addMember}
                isDisabled={!newMemberAddress}
              >
                メンバーーを追加
              </Button>
            </>
          )}
        </Stack>
      </GridItem>
    </Grid>
  )
}

export default GroupDetail
