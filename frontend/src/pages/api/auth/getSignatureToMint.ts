import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import supabase from '@/lib/supabase'
import alchemyClient from '@/lib/alchemy'

export const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<any>,
) => {
  if (req.method === 'POST') {
    const { contractAddress, eventId, ticketId, code } = req.body
    const userWalletAddress = req.headers['x-thirdevent-address'] as string

    const { data, error } = await supabase
      .from('tickets')
      .select('rule_type, rule_value')
      .eq('id', ticketId)
      .eq('event_id', eventId)
      .maybeSingle()

    console.log('data', data)
    console.log('error', error)

    if (!data || error) {
      res.status(400).json({ message: 'You cannot mint.' })
      return
    }

    let canMint = false
    const { rule_type, rule_value } = data

    if (rule_type === 'code') {
      if (rule_value === code) {
        console.log('you can mint!')
        canMint = true
      }
    }

    if (rule_type === 'allowlist') {
      const allowlist = rule_value.split(',')
      if (allowlist.includes(userWalletAddress)) {
        console.log('you can mint!')
        canMint = true
      }
    }

    if (rule_type === 'nft') {
      const nftContractAddresses = rule_value.split(',')
      const { ownedNfts } = await alchemyClient.nft.getNftsForOwner(
        userWalletAddress,
        {
          contractAddresses: nftContractAddresses,
          omitMetadata: true,
        },
      )

      if (ownedNfts.length > 0) {
        console.log('you can mint!')
        canMint = true
      }
    }

    if (canMint) {
      const signerPrivateKey = process.env.WALLET_PRIVATE_KEY ?? ''
      const signer = new ethers.Wallet(signerPrivateKey)

      const message = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ['address', 'address', 'string'],
          [contractAddress, userWalletAddress, ticketId],
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
