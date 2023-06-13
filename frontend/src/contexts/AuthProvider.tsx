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
import { useAddress, useDisconnect } from '@thirdweb-dev/react'

interface AuthContextProps {
  user: User | null
  revalidateToken: () => boolean
  authSignOut: () => void
  fetchUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined)

const COOKIE = {
  TOKEN_EXPIRATION: 'thirdevent-token_expiration',
  USER_ID: 'thirdevent-user_id',
}

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const address = useAddress()
  const disconnect = useDisconnect()

  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

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
    if (
      !userId ||
      !tokenExpiration ||
      Number(tokenExpiration) * 1000 < Date.now()
    ) {
      authSignOut()
      return false
    }

    setUserId(userId)
    return true
  }, [authSignOut])

  const fetchUser = useCallback(async () => {
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    console.log('fetUser', userData)

    if (!userData) return
    const user: User = {
      id: userData.id,
      walletAddress: userData.wallet_address,
      name: userData.name,
      thumbnail: userData.thumbnail,
    }
    setUser(user)
  }, [userId])

  useEffect(() => {
    if (!userId || !address) return

    fetchUser()
  }, [userId, address, fetchUser])

  useEffect(() => {
    console.log('useEffect,checkTokenExpiration')
    const checkTokenExpiration = () => {
      const tokenIsValid = revalidateToken()
      if (!tokenIsValid) disconnect()
    }
    checkTokenExpiration()
    const intervalId = setInterval(checkTokenExpiration, 30 * 60 * 1000) // every 30 minutes

    return () => clearInterval(intervalId)
  }, [revalidateToken, disconnect])

  return (
    <AuthContext.Provider
      value={{
        user,
        revalidateToken,
        authSignOut,
        fetchUser,
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
