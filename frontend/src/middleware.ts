import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// import jwt from 'jsonwebtoken'
// import type { JwtPayload } from 'jsonwebtoken'
import { jwtVerify } from 'jose'

export const config = {
  matcher: ['/api/auth/:function*'],
}

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('thirdevent-access_token')
  console.log('request.cookies', request.cookies)
  console.log('accessToken', accessToken)

  if (!accessToken) {
    return new NextResponse(
      JSON.stringify({ success: false, message: 'Invalid token.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const { payload } = await jwtVerify(
      accessToken.value,
      new TextEncoder().encode(process.env.JWT_SECRET ?? ''),
    )
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return new NextResponse(
        JSON.stringify({ success: false, message: 'Token expired.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return NextResponse.next()
  } catch (e) {
    console.log('e', e)
    return new NextResponse(
      JSON.stringify({ success: false, message: 'Invalid token.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
