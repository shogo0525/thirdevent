import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import Cookies from 'js-cookie'
import supabase from '@/lib/supabase'
import type { User } from '@/types'
import {
  useAddress,
  useDisconnect,
  useMetamask,
  useConnectedWallet,
  useNetworkMismatch,
  useSwitchChain,
} from '@thirdweb-dev/react'
import { UserWallet } from '@thirdweb-dev/sdk'
import { fetchWithSignature } from '@/lib/fetchWithSignature'
import { COOKIE } from '@/constants'
import { isTokenExpired } from '@/utils'
import { ACTIVE_CHAIN } from '@/constants'

interface AuthContextProps {
  user: User | null
  connectedWallet: UserWallet | undefined
  isNetworkMismatched: boolean
  authSignIn: () => Promise<void>
  authSignOut: () => void
  fetchUser: () => Promise<void>
  switchActiveChain: () => void
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined)

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const address = useAddress()
  const connectWithMetamask = useMetamask()
  const disconnect = useDisconnect()
  const connectedWallet = useConnectedWallet()

  const isNetworkMismatched = useNetworkMismatch()
  const switchChain = useSwitchChain()

  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  React.useEffect(() => {
    if ((window.ethereum as any).selectedAddress) {
      connectWithMetamask()
    }
  }, [connectWithMetamask])

  const authSignIn = async () => {
    const wallet = await connectWithMetamask()

    try {
      const response = await fetchWithSignature('/api/login', wallet, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        disconnect()
      }
      const data = await response.json()
      revalidateToken()
    } catch (e) {
      console.log('e', e)
      disconnect()
    }
  }

  const authSignOut = useCallback(() => {
    Cookies.remove(COOKIE.TOKEN_EXPIRATION)
    Cookies.remove(COOKIE.USER_ID)
    setUser(null)
    setUserId(null)
    disconnect()
  }, [disconnect])

  const revalidateToken = useCallback(() => {
    const tokenExpiration = Cookies.get(COOKIE.TOKEN_EXPIRATION)
    const userId = Cookies.get(COOKIE.USER_ID) ?? null
    if (!userId || isTokenExpired(tokenExpiration)) {
      authSignOut()
      return false
    }

    setUserId(userId)
    return true
  }, [authSignOut])

  const fetchUser = useCallback(async () => {
    const { data: userData } = await supabase
      .from('users')
      .select('*, groups(*)')
      .eq('id', userId)
      .single()

    if (!userData) return
    const user: User = {
      id: userData.id,
      walletAddress: userData.wallet_address,
      name: userData.name,
      thumbnail: userData.thumbnail,
      groups: (userData.groups ?? []).map((d: any) => ({
        id: d.id,
        name: d.name,
        contractAddress: d.contract_address,
        thumbnail: d.thumbnail,
      })),
    }
    setUser(user)
  }, [userId])

  useEffect(() => {
    if (!userId || !address) return

    fetchUser()
  }, [userId, address, fetchUser])

  useEffect(() => {
    const checkTokenExpiration = () => {
      const tokenIsValid = revalidateToken()
      if (!tokenIsValid) authSignOut()
    }
    const intervalId = setInterval(checkTokenExpiration, 30 * 60 * 1000) // every 30 minutes

    checkTokenExpiration()

    return () => clearInterval(intervalId)
  }, [revalidateToken, authSignOut])

  const switchActiveChain = () => {
    switchChain(ACTIVE_CHAIN.chainId)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        connectedWallet,
        isNetworkMismatched,
        authSignIn,
        authSignOut,
        fetchUser,
        switchActiveChain,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { AuthProvider, useAuth }
