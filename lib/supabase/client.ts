import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfiguration } from './config'

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (browserClient) return browserClient

  const { url, publishableKey } = getSupabaseConfiguration()
  browserClient = createBrowserClient(url, publishableKey)

  return browserClient
}
