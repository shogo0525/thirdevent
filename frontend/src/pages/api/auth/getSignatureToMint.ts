import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import supabase from '@/lib/supabase'

export const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<any>,
) => {
  if (req.method === 'POST') {
    const { contractAddress, eventId, ticketIndex } = req.body
    const userWalletAddress = req.headers['x-thirdevent-address'] as string

    const { data, error } = await supabase
      .from('mint_rules')
      .select('rule_type, rule_value')
      .eq('event_id', eventId)
      .eq('ticket_index', ticketIndex)
      .maybeSingle()

    console.log('data', data)
    console.log('error', error)

    if (!data || error) {
      res.status(400).json({ message: 'You cannot mint.' })
      return
    }

    let canMint = false
    const { rule_type, rule_value } = data
    if (rule_type === 'allowlist') {
      if (rule_value.includes(userWalletAddress)) {
        console.log('you can mint!')
        canMint = true
      }
    }

    if (canMint) {
      const signerPrivateKey = process.env.WALLET_PRIVATE_KEY ?? ''
      const signer = new ethers.Wallet(signerPrivateKey)

      const message = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ['address', 'address', 'uint256'],
          [contractAddress, userWalletAddress, ticketIndex],
        ),
      )
      const signature = await signer.signMessage(message)

      res.status(200).json({ signature })
    } else {
      res.status(400).json({ message: 'You cannot mint.' })
    }
  } else {
    res.status(400)
  }
}

export default handler
