import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const nextPath = url.searchParams.get('next')
  const destination = nextPath?.startsWith('/') && !nextPath.startsWith('//')
    ? new URL(nextPath, url.origin)
    : new URL('/', url.origin)

  if (code) {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        error: 'Account sign-in is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
      }, { status: 503 })
    }
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.json({ error: 'Sign-in could not be completed. Please restart the sign-in flow.' }, { status: 400 })
    }
  }

  return NextResponse.redirect(destination)
}
