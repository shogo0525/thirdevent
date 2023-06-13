import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import Cookies from 'js-cookie'

type RevalidateTokenResponse = {
  tokenIsValid: boolean
}
interface AuthContextProps {
  tokenIsValid: boolean | null
  userId: string
  revalidateToken: () => RevalidateTokenResponse
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined)

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [tokenIsValid, setTokenIsValid] = useState<boolean | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const revalidateToken = () => {
    const tokenExpiration = Cookies.get('thirdevent-token_expiration')
    const userId = Cookies.get('thirdevent-user_id') ?? null

    if (!tokenExpiration) {
      return {
        // isTokenEmpty: true,
        tokenIsValid: false,
      }
    }

    let isValid = true
    if (Number(tokenExpiration) * 1000 < Date.now()) {
      isValid = false
    }

    setTokenIsValid(isValid)
    setUserId(userId)

    return {
      // isTokenEmpty: false,
      tokenIsValid: isValid,
    }
  }

  useEffect(() => {
    revalidateToken()
  }, [])

  return (
    <AuthContext.Provider value={{ tokenIsValid, userId, revalidateToken }}>
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
