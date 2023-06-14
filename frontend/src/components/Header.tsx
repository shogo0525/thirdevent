import { useEffect, useState, useCallback } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { HamburgerIcon } from '@chakra-ui/icons'
import {
  Flex,
  Link,
  Text,
  Button,
  IconButton,
  Stack,
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
  Avatar,
} from '@chakra-ui/react'
import { useAuth } from '@/contexts/AuthProvider'

const Header = () => {
  const router = useRouter()

  const { isOpen, onOpen, onClose } = useDisclosure()
  const { authSignIn, authSignOut, user } = useAuth()

  const handleSignIn = () => {
    authSignIn()
  }
  const handleSignOut = () => {
    authSignOut()
    onClose()
    router.push('/')
  }

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
                  <Avatar src={user.thumbnail} size='lg' />
                  <Text>{user.name}</Text>
                </HStack>
                <Text fontSize='sm'>ウォレットアドレス</Text>
                <Text fontSize='sm'>{user.walletAddress}</Text>

                <Divider />
              </Stack>
            </DrawerHeader>
          )}

          <DrawerBody>
            <Stack>
              {user && (
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

          <DrawerFooter>
            {user && (
              <Button onClick={handleSignOut} colorScheme={'red'}>
                ログアウト
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Link as={NextLink} href='/' textDecoration='none !important'>
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
        {user && (
          <HStack spacing={4}>
            <IconButton
              variant='ghost'
              fontSize='4xl'
              _hover={{ background: 'transparent' }}
              onClick={onOpen}
              aria-label='menu'
              icon={<HamburgerIcon />}
            />
            <Link as={NextLink} href={`/users/${user?.id}`}>
              <Avatar src={user?.thumbnail} size='md' />
            </Link>
          </HStack>
        )}

        {!user && (
          <Button
            colorScheme='white'
            bg='black'
            rounded={'full'}
            onClick={() => router.push('/login')}
          >
            ログイン
          </Button>
        )}
      </Flex>
    </Flex>
  )
}

export default Header
