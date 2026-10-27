'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'

export default function ApiTestPage() {
  const [apiKey, setApiKey] = useState('')
  const [result, setResult] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [success, setSuccess] = useState(false)
  const isDevelopment = process.env.NODE_ENV === 'development'

  async function testKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setResult('')
    setIsTesting(true)
    try {
      const response = await fetch('/api/abhibots-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      const data: { ok?: boolean; message?: string; error?: string } = await response.json()
      setSuccess(response.ok && data.ok === true)
      setResult(data.message ?? data.error ?? 'The test returned no result.')
    } catch {
      setSuccess(false)
      setResult('Could not contact the local test endpoint. Make sure the development server is running.')
    } finally {
      setApiKey('')
      setIsTesting(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', padding: '48px 20px', background: '#080b14', color: '#e7edf8', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <section style={{ maxWidth: 560, margin: '8vh auto', padding: 28, border: '1px solid rgba(145,166,207,.18)', borderRadius: 16, background: 'rgba(16,22,37,.82)' }}>
        <p style={{ color: '#66e7ff', fontSize: 12, letterSpacing: '.16em' }}>MIRA · LOCAL DIAGNOSTICS</p>
        <h1 style={{ fontSize: 26 }}>Test your AbhiBots API key</h1>
        {isDevelopment ? (
          <>
            <p style={{ color: '#9aa9bd', lineHeight: 1.6 }}>
              Your key is sent only to this local app and AbhiBots for one short test. It is not saved, logged, or included in the response. The test uses ABHIBOTS_MODEL and ABHIBOTS_BASE_URL from .env.local, just like chat. This page and its endpoint are disabled in production.
            </p>
            <form onSubmit={testKey}>
              <label htmlFor="abhibots-key" style={{ display: 'block', margin: '24px 0 8px', fontSize: 13 }}>AbhiBots API key</label>
              <input
                id="abhibots-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                required
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Paste your AbhiBots API key here"
                style={{ width: '100%', padding: 13, borderRadius: 8, border: '1px solid rgba(145,166,207,.25)', background: '#0b1120', color: '#e7edf8' }}
              />
              <button type="submit" disabled={isTesting || !apiKey.trim()} style={{ marginTop: 14, padding: '11px 16px', border: 0, borderRadius: 8, color: '#07121a', background: '#66e7ff', fontWeight: 700, opacity: isTesting || !apiKey.trim() ? .55 : 1 }}>
                {isTesting ? 'Testing key…' : 'Test AbhiBots key'}
              </button>
            </form>
            {result && <p role="status" style={{ color: success ? '#69e5ad' : '#ffb4a6', lineHeight: 1.6 }}>{result}</p>}
          </>
        ) : (
          <p style={{ color: '#ffb4a6', lineHeight: 1.6 }}>For your safety, key testing is only available on a local development server. Run <code>pnpm dev</code> and open <code>http://localhost:3000/api-test</code>.</p>
        )}
        <Link href="/" style={{ display: 'inline-block', marginTop: 18, color: '#66e7ff' }}>Back to MIRA</Link>
      </section>
    </main>
  )
}
