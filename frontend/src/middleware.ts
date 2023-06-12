import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ethers } from 'ethers'

export const config = {
  matcher: ['/api/:function', '/api/auth/login'],
}

export function middleware(request: NextRequest) {
  const address = request.headers.get('X-THIRDEVENT-ADDRESS')
  const message = request.headers.get('X-THIRDEVENT-MESSAGE') ?? ''
  const signature = request.headers.get('X-THIRDEVENT-SIGNATURE') ?? ''

  if (!address || !message || !signature) {
    return new NextResponse(
      JSON.stringify({ success: false, message: 'Wrong signature.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const recoveredAddress = ethers.utils.verifyMessage(message, signature)

  if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
    return new NextResponse(
      JSON.stringify({ success: false, message: 'Wrong signature.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return NextResponse.next()
}
