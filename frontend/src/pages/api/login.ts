import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import supabase from '@/lib/supabase'
import jwt from 'jsonwebtoken'
import cookie from 'cookie'

export const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<any>,
) => {
  if (req.method === 'POST') {
    const address = req.headers['x-thirdevent-address'] as string
    const message = req.headers['x-thirdevent-message'] as string
    const signature = req.headers['x-thirdevent-signature'] as string

    if (!address || !message || !signature) {
      return res.status(400).json({ message: 'Wrong signature.' })
    }

    const recoveredAddress = ethers.utils.verifyMessage(message, signature)

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(400).json({ message: 'Wrong signature.' })
    }

    try {
      let { data: user, error: e } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', address)
        .maybeSingle()

      if (!user) {
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            wallet_address: address,
            auth: {
              lastAuth: new Date().toISOString(),
              lastAuthStatus: 'success',
            },
          })
          .select()
          .single()
        user = newUser
      }

      const JWT_EXPIRY_IN_SECONDS = 1 * 60 // 60 minutes

      const accessToken = jwt.sign(
        {
          sub: user?.id,
          wallet_address: address,
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
