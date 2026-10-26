import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfiguration } from './config'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, publishableKey } = getSupabaseConfiguration()

  return createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Components cannot always write cookies; proxy handles refreshes.
          }
        },
      },
    },
  )
}
