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
  // console.log(data)

  const events =
    eventData?.map((d) => {
      const event: Event = {
        id: d.id,
        contractAddress: d.contract_address,
        title: d.title,
        thumbnail: d.thumbnail,
        group: {
          id: d.group.id,
          name: d.group.name,
          contractAddress: d.group.contract_address,
        },
      }
      return event
    }) ?? []

  const groups =
    groupData?.map((d) => {
      const group: Group = {
        id: d.id,
        contractAddress: d.contract_address,
        name: d.name,
        thumbnail: d.thumbnail,
      }
      return group
    }) ?? []

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
        <Flex gap={4} flexWrap={'wrap'}>
          {events.map((event) => (
            <Link
              key={event.id}
              href={`events/${event.id}`}
              textDecoration='none !important'
            >
              <Card maxW='sm' width='200px' borderRadius='lg'>
                <CardBody p={0}>
                  <Image
                    src={event.thumbnail}
                    alt={event.title}
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
                      {event.title}
                    </Text>

                    <Text fontSize='sm' noOfLines={2} height='40px'>
                      主催：{event.group.name}
                    </Text>
                  </Stack>
                </CardBody>
              </Card>
            </Link>
          ))}
        </Flex>

        <Heading size='md' mt={6}>
          グループ一覧
        </Heading>
        <Flex gap={4} flexWrap={'wrap'}>
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`groups/${group.id}`}
              textDecoration='none !important'
            >
              <Card maxW='sm' width='200px' borderRadius='lg'>
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
        </Flex>
      </Stack>
    </>
  )
}

export default Home
