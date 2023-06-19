import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { MyHead } from '@/components/MyHead'
import { Container, Stack, Button, Text, Image, HStack } from '@chakra-ui/react'
import { COOKIE } from '@/constants'
import { isTokenExpired } from '@/utils'
import { useAuth } from '@/contexts/AuthProvider'

interface LoginProps {}

export const getServerSideProps: GetServerSideProps<LoginProps> = async (
  context,
) => {
  const tokenExpiration = context.req.cookies[COOKIE.TOKEN_EXPIRATION]
  console.log(
    'isTokenExpired(tokenExpiration)',
    isTokenExpired(tokenExpiration),
  )
  // if (!isTokenExpired(tokenExpiration)) {
  //   return {
  //     redirect: {
  //       destination: '/',
  //       permanent: false,
  //     },
  //   }
  // }

  return {
    props: {},
  }
}

const Login = (_: LoginProps) => {
  const router = useRouter()
  const { authSignIn } = useAuth()

  const handleSignIn = async () => {
    await authSignIn()
    router.push('/')
  }
  return (
    <>
      <MyHead title='ログイン' />
      <Container maxW='xl'>
        <Stack spacing={10}>
          <Text fontSize={'xl'} fontWeight={'bold'}>
            thirdeventでイベントを開催・参加する
          </Text>
          <Stack
            maxW={'md'}
            justifyContent={'space-between'}
            p={6}
            bg='white'
            rounded={'lg'}
          >
            <HStack>
              <Image src='/images/metamask.svg' boxSize='60px' alt='metamask' />
              <Text fontSize={'xl'} fontWeight={'bold'}>
                ウォレットで
              </Text>
            </HStack>
            <Button
              colorScheme='white'
              bg='black'
              rounded={'full'}
              onClick={handleSignIn}
            >
              ログインする
            </Button>
          </Stack>
        </Stack>
      </Container>
    </>
  )
}

export default Login
