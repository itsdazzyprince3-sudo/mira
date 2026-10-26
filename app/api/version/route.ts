import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export function GET() {
  return NextResponse.json(
    { version: process.env.MIRA_APP_VERSION ?? 'unknown' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
