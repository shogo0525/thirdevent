import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import supabase from '@/lib/supabase'
import alchemyClient from '@/lib/alchemy'

export const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<any>,
) => {
  if (req.method === 'POST') {
    const { contractAddress, eventId, tokenId } = req.body
    const userWalletAddress = req.headers['x-thirdevent-address'] as string

    const { owners } = await alchemyClient.nft.getOwnersForNft(
      contractAddress,
      tokenId,
    )
    console.log(owners)

    if (
      !owners
        .map((add) => add.toLowerCase())
        .includes(userWalletAddress.toLowerCase())
    ) {
      res.status(400).json({ message: 'You cannot mint.' })
      return
    }

    const signerPrivateKey = process.env.WALLET_PRIVATE_KEY ?? ''
    const signer = new ethers.Wallet(signerPrivateKey)

    const message = ethers.utils.arrayify(
      ethers.utils.solidityKeccak256(
        ['address', 'address', 'uint256'],
        [contractAddress, userWalletAddress, tokenId],
      ),
    )
    const signature = await signer.signMessage(message)

    res.status(200).json({ signature })
  } else {
    res.status(400)
  }
}

export default handler
