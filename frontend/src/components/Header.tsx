import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import supabase from '@/lib/supabase'
import {
  ConnectWallet,
  useDisconnect,
  useAddress,
  useSDK,
} from '@thirdweb-dev/react'
import { AddIcon, HamburgerIcon } from '@chakra-ui/icons'
import {
  Flex,
  Link,
  Text,
  Button,
  IconButton,
  Image,
  Stack,
  Icon,
  Divider,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  HStack,
} from '@chakra-ui/react'
import { fetchWithSignature } from '@/lib/fetchWithSignature'
import { useAuth } from '@/contexts/AuthProvider'
import type { User } from '@/types'

const Header = () => {
  const router = useRouter()
  const address = useAddress()
  const sdk = useSDK()
  const disconnect = useDisconnect()

  const { revalidateToken } = useAuth()

  const { isOpen, onOpen, onClose } = useDisclosure()

  const checkTokenExpiration = () => {
    const { isTokenValid } = revalidateToken()
    if (!isTokenValid) disconnect()
  }

  useEffect(() => {
    checkTokenExpiration()
    const intervalId = setInterval(checkTokenExpiration, 30 * 60 * 1000) // every 30 minutes

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!sdk) return

    sdk.wallet.events.once('signerChanged', async (signer) => {
      if (!signer || !sdk) return
      const { isTokenValid } = revalidateToken()
      if (isTokenValid) return

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

  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!address) return

    const fetchUser = async () => {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle()

      console.log('user', user)
      console.log('address', address)

      if (user) {
        const u: User = {
          id: user.id,

          walletAddress: user.wallet_address,
          name: user.name,
          thumbnail: user.thumbnail,
        }
        setUser(u)
      }
    }
    fetchUser()
  }, [address])

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
      <Drawer isOpen={isOpen} placement='right' onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          {user && (
            <DrawerHeader>
              <Stack>
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
                <Divider />
              </Stack>
            </DrawerHeader>
          )}

          <DrawerBody>
            <Stack>
              {address && user && (
                <>
                  <Link
                    as={NextLink}
                    color='teal.500'
                    href={`/users/${user.id}`}
                  >
                    マイページ
                  </Link>
                  <Button
                    onClick={() => {
                      router.push('/groups/new')
                    }}
                  >
                    グループ作成
                  </Button>
                  {/* TODO */}
                  <Button onClick={() => {}}>イベント作成</Button>
                </>
              )}
            </Stack>
          </DrawerBody>

          {/* <DrawerFooter>
            <Button variant='outline' mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme='blue'>Save</Button>
          </DrawerFooter> */}
        </DrawerContent>
      </Drawer>

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
        <IconButton
          variant='ghost'
          fontSize='4xl'
          _hover={{ background: 'transparent' }}
          onClick={onOpen}
          aria-label='menu'
          icon={<HamburgerIcon />}
        />

        <ConnectWallet />
      </Flex>
    </Flex>
  )
}

export default Header
