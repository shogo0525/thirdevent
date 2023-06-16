import { GetServerSideProps } from 'next'
import { MyHead } from '@/components/MyHead'
import supabase from '@/lib/supabase'
import { Event, Group } from '@/types'
import {
  Stack,
  Box,
  Button,
  Text,
  Input,
  Link,
  Heading,
  Flex,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Image,
  SimpleGrid,
  Avatar,
  HStack,
} from '@chakra-ui/react'

interface HomeProps {
  events: Event[]
  groups: Group[]
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  const { data: eventData } = await supabase
    .from('events')
    .select('*, group:groups(*)')
    .neq('thumbnail', null)

  const { data: groupData } = await supabase
    .from('groups')
    .select('*')
    .neq('thumbnail', null)
  console.log(eventData)

  const events = (eventData ?? []).map((d) => {
    const event: Event = {
      id: d.id,
      contractAddress: d.contract_address,
      title: d.title,
      thumbnail: d.thumbnail,
      group: {
        id: d.group.id,
        name: d.group.name,
        contractAddress: d.group.contract_address,
        thumbnail: d.group.thumbnail,
      },
    }
    return event
  })

  const groups = (groupData ?? []).map((d) => {
    const group: Group = {
      id: d.id,
      contractAddress: d.contract_address,
      name: d.name,
      thumbnail: d.thumbnail,
    }
    return group
  })

  return {
    props: {
      events,
      groups,
    },
  }
}

const Home = ({ events, groups }: HomeProps) => {
  return (
    <>
      <MyHead />
      <Stack spacing={6}>
        <Heading size='md'>イベント一覧</Heading>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
          {events.map((event) => (
            <Link
              key={event.id}
              href={`events/${event.id}`}
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
                    <HStack>
                      <Avatar src={event.group?.thumbnail} size='sm' />
                      <Text fontSize='sm'>主催：{event.group.name}</Text>
                    </HStack>
                    <Text fontSize='sm' color='teal.500'>
                      #web3 #crypto #京都
                    </Text>
                  </Stack>
                </CardBody>
              </Card>
            </Link>
          ))}
        </SimpleGrid>

        <Heading size='md' mt={6}>
          グループ一覧
        </Heading>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`groups/${group.id}`}
              textDecoration='none !important'
            >
              <Card borderRadius='lg'>
                <CardBody p={0}>
                  <Image
                    src={group.thumbnail}
                    alt={group.name}
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
                      {group.name}
                    </Text>
                  </Stack>
                </CardBody>
              </Card>
            </Link>
          ))}
        </SimpleGrid>
      </Stack>
    </>
  )
}

export default Home
