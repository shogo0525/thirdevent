import type { AppProps } from 'next/app'
import { ThirdwebProvider } from '@thirdweb-dev/react'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import Layout from '@/components/Layout'
import { AuthProvider } from '@/contexts/AuthProvider'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThirdwebProvider activeChain='mumbai'>
      <AuthProvider>
        <ChakraProvider
          theme={extendTheme({
            styles: {
              global: {
                body: {
                  backgroundColor: 'gray.300',
                },
              },
            },
          })}
        >
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </ChakraProvider>
      </AuthProvider>
    </ThirdwebProvider>
  )
}
