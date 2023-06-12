import { useEffect } from 'react'
import { useRouter } from 'next/router'
import {
  ConnectWallet,
  useDisconnect,
  useAddress,
  useSDK,
} from '@thirdweb-dev/react'
import { AddIcon } from '@chakra-ui/icons'
import {
  Flex,
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
import { fetchWithSignature } from '@/lib/fetchWithSignature'
import { useAuth } from '@/contexts/AuthProvider'

const Header = () => {
  const router = useRouter()
  const address = useAddress()
  const sdk = useSDK()
  const disconnect = useDisconnect()
  const { onClose } = useDisclosure()

  const { revalidateToken } = useAuth()

  // useEffect(() => {
  //   const tokenIsValid = revalidateToken()
  //   console.log('tokenIsValid1 ', tokenIsValid)
  //   if (tokenIsValid === false) disconnect()
  // }, [revalidateToken, disconnect])

  useEffect(() => {
    if (!sdk) return

    sdk.wallet.events.once('signerChanged', async (signer) => {
      if (!signer || !sdk) return

      const tokenIsValid = revalidateToken()
      if (tokenIsValid === true) return

      const walletAddress = await signer.getAddress()

      try {
        const response = await fetchWithSignature('/api/login', sdk.wallet, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        console.log(response)
        if (!response.ok) {
          disconnect()
        }
        const data = await response.json()
        console.log('data', data)
      } catch (e) {
        console.log('e', e)
        disconnect()
      }
    })
  }, [sdk, revalidateToken, disconnect])

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
