import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import Cookies from 'js-cookie'

interface AuthContextProps {
  tokenIsValid: boolean | null
  revalidateToken: () => boolean
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined)

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [tokenIsValid, setTokenIsValid] = useState<boolean | null>(null)

  const revalidateToken = () => {
    const tokenExpiration =
      Number(Cookies.get('thirdevent-token_expiration')) ?? 0
    // console.log('tokenExpiration', tokenExpiration)
    // console.log('Date.now()', Date.now())
    // console.log('tokenExpiration * 1000', tokenExpiration * 1000)
    // console.log(
    //   'tokenExpiration * 1000 < Date.now()',
    //   tokenExpiration * 1000 < Date.now(),
    // )

    let isValid = true
    if (!tokenExpiration || tokenExpiration * 1000 < Date.now()) {
      isValid = false
    }

    setTokenIsValid(isValid)
    return isValid
  }

  useEffect(() => {
    revalidateToken()
  }, [])

  return (
    <AuthContext.Provider value={{ tokenIsValid, revalidateToken }}>
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
