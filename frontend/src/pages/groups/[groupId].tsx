import { GetServerSideProps } from 'next'
import React, { useState } from 'react'
import { useRouter } from 'next/router'
import NextLink from 'next/link'
import supabase from '@/lib/supabase'
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
  SimpleGrid,
  Popover,
  PopoverTrigger,
  PopoverHeader,
  PopoverCloseButton,
  PopoverContent,
  PopoverBody,
} from '@chakra-ui/react'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { truncateContractAddress } from '@/utils'
import { COOKIE } from '@/constants'
import type { Group, User } from '@/types'

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
      thumbnail: e.thumbnail,
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

  const [newMember, setNewMember] = useState<User | null>(null)
  const [searchResults, setSearchResults] = useState<User[]>([])

  const { mutateAsync: mutateAddMember, isLoading: isAddingMember } =
    useContractWrite(groupContract, 'addMember')
  const addMember = async () => {
    if (!newMember) return
    try {
      const { receipt } = await mutateAddMember({
        args: [newMember.walletAddress],
      })
      console.log('receipt', receipt)
      const { error } = await supabase
        .from('members')
        .insert({ group_id: group.id, user_id: newMember.id })

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

  const searchUser = async () => {
    const currentMemberIds = (group.members ?? []).map((user) => user.id)

    const { data } = await supabase
      .from('users')
      .select('*')
      .not('id', 'in', `(${currentMemberIds.join(',')})`)

    const users: User[] = (data ?? []).map((d) => ({
      id: d.id,
      walletAddress: d.wallet_address,
      name: d.name,
      thumbnail: d.thumbnail,
    }))
    setSearchResults(users)
  }

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
          <Heading size='md'>イベント一覧</Heading>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
            {group.events?.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                textDecoration='none !important'
              >
                <Card borderRadius='lg'>
                  <CardBody p={0}>
                    <Image
                      src={event.thumbnail}
                      alt={event.title}
                      borderTopRadius='lg'
                      boxSize={'150px'}
                      width='100%'
                      objectFit='cover'
                    />
                    <Stack mt={2} p={2}>
                      <Text
                        fontSize='sm'
                        fontWeight='bold'
                        noOfLines={2}
                        height='40px'
                      >
                        {event.title}
                      </Text>
                      <Text fontSize='sm' color='teal.500'>
                        #web3 #crypto #京都
                      </Text>
                    </Stack>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </SimpleGrid>
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

              <Popover>
                {({ onClose }) => (
                  <>
                    <PopoverTrigger>
                      <Input
                        placeholder='メンバー検索'
                        value={newMember?.walletAddress}
                        onFocus={() => searchUser()}
                      />
                    </PopoverTrigger>
                    <PopoverContent>
                      <PopoverHeader>ユーザーリスト</PopoverHeader>
                      <PopoverCloseButton />
                      <PopoverBody>
                        {searchResults.length > 0 ? (
                          <Stack>
                            {searchResults.map((user, i) => (
                              <Stack key={user.id}>
                                <HStack justifyContent={'space-between'}>
                                  <HStack>
                                    <Avatar src={user.thumbnail} size='sm' />
                                    <Text fontSize={'lg'}>{user.name}</Text>
                                  </HStack>
                                  <Button
                                    colorScheme='white'
                                    bg='black'
                                    rounded={'full'}
                                    onClick={() => {
                                      setNewMember(user)
                                      onClose()
                                    }}
                                  >
                                    選択
                                  </Button>
                                </HStack>
                                <Text fontSize={'sm'}>
                                  ウォレットアドレス: {user.walletAddress}
                                </Text>
                                {i !== searchResults.length - 1 && <Divider />}
                              </Stack>
                            ))}
                          </Stack>
                        ) : (
                          <Text>検索結果がありません</Text>
                        )}
                      </PopoverBody>
                    </PopoverContent>
                  </>
                )}
              </Popover>
              <Button
                isLoading={isAddingMember}
                onClick={addMember}
                isDisabled={!newMember}
              >
                メンバーを追加
              </Button>
            </>
          )}
        </Stack>
      </GridItem>
    </Grid>
  )
}

export default GroupDetail
