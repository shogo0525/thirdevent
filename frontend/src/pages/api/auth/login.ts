import type { NextApiRequest, NextApiResponse } from 'next'
import supabase from '@/lib/supabase'
import jwt from 'jsonwebtoken'
import cookie from 'cookie'

export const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<any>,
) => {
  if (req.method === 'POST') {
    const { walletAddress } = req.body

    try {
      let { data: user, error: e } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .maybeSingle()

      if (!user) {
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            wallet_address: walletAddress,
            auth: {
              lastAuth: new Date().toISOString(),
              lastAuthStatus: 'success',
            },
          })
          .select()
          .single()
        user = newUser
      }

      const JWT_EXPIRY_IN_SECONDS = 60 * 60 // 60 minutes

      const accessToken = jwt.sign(
        {
          sub: user?.id,
          wallet_address: walletAddress,
          aud: 'authenticated',
          role: 'authenticated',
        },
        process.env.JWT_SECRET ?? '',
        { expiresIn: JWT_EXPIRY_IN_SECONDS },
      )

      res.setHeader('Set-Cookie', [
        cookie.serialize('thirdevent-access_token', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development', // Use HTTPS in production
          maxAge: JWT_EXPIRY_IN_SECONDS,
          path: '/',
          sameSite: 'strict',
        }),
        cookie.serialize(
          'thirdevent-token_expiration',
          `${Date.now() / 1000 + JWT_EXPIRY_IN_SECONDS}`,
          {
            httpOnly: false,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: JWT_EXPIRY_IN_SECONDS,
            path: '/',
            sameSite: 'strict',
          },
        ),
      ])

      return res
        .status(200)
        .json({ message: 'User authenticated', accessToken })
    } catch (e) {}
  } else {
    res.status(400)
  }
}

export default handler
