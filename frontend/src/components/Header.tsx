import { useRouter } from 'next/router'
import { ConnectWallet, useAddress } from '@thirdweb-dev/react'
import { AddIcon } from '@chakra-ui/icons'
import {
  Flex,
  Heading,
  Link,
  Text,
  Button,
  IconButton,
  Stack,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  useDisclosure,
} from '@chakra-ui/react'

const Header = () => {
  const router = useRouter()
  const address = useAddress()
  const { onClose } = useDisclosure()
  return (
    <Flex
      justifyContent='space-between'
      alignItems='center'
      flexDirection={{
        base: 'column',
        md: 'row',
      }}
      p={3}
    >
      <Link href='/' textDecoration='none !important'>
        <Text
          fontSize='4xl'
          fontWeight='bold'
          bgGradient='linear-gradient(45deg, #FF0080, #7928CA)'
          bgClip='text'
        >
          thirdevent
        </Text>
      </Link>
      <Flex justifyContent='space-between' alignItems='center' gap={4}>
        {address && (
          <Popover closeOnBlur={true}>
            <PopoverTrigger>
              <IconButton aria-label='Add' icon={<AddIcon />} isRound={true} />
            </PopoverTrigger>
            <PopoverContent>
              <PopoverArrow />
              <PopoverBody>
                <Stack>
                  <Button
                    onClick={() => {
                      router.push('/groups/new')
                      onClose()
                    }}
                  >
                    グループ作成
                  </Button>
                  <Button>イベント作成</Button>
                </Stack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        )}
        <ConnectWallet />
      </Flex>
    </Flex>
  )
}

export default Header
