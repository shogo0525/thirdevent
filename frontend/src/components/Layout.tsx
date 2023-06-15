import { ReactElement } from 'react'
import Header from '@/components/Header'

import { Box, Container } from '@chakra-ui/react'

const Layout = ({ children }: { children: ReactElement }) => {
  return (
    <>
      <Header />
      <Container as='main' pt={4} py={10} maxW='container.lg'>
        {children}
      </Container>
    </>
  )
}

export default Layout
