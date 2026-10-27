import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { NextResponse } from 'next/server'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return NextResponse.json({ error: 'Send chat requests as JSON.' }, { status: 415 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'The chat request must contain valid JSON.' }, { status: 400 })
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'The chat request must be a JSON object.' }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  }
  if (message.length > 8000) {
    return NextResponse.json({ error: 'Messages must be 8,000 characters or fewer.' }, { status: 413 })
  }
  if (!process.env.ABHIBOTS_API_KEY) {
    return NextResponse.json({
      error: 'MIRA’s AbhiBots connection is not configured. Set ABHIBOTS_API_KEY in .env.local or in your Vercel project’s Environment Variables, then restart or redeploy.',
    }, { status: 503 })
  }

  const history = Array.isArray(body.history)
    ? body.history.filter((item): item is { role: 'user' | 'assistant'; content: string } => {
        if (!isRecord(item)) return false
        return (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string'
      }).slice(-10).map(({ role, content }) => ({ role, content: content.slice(0, 4000) }))
    : []

  try {
    const abhibots = createOpenAI({
      apiKey: process.env.ABHIBOTS_API_KEY,
      baseURL: process.env.ABHIBOTS_BASE_URL || 'https://opus.abhibots.com/v1',
    })
    const result = await generateText({
      model: abhibots(process.env.ABHIBOTS_MODEL || 'nvidia/llama-3.1-nemotron-ultra-253b-v1'),
      system: `You are MIRA, a capable, warm, concise personal AI assistant. Reply naturally to every user message. Be honest about what you can and cannot do in this browser app, never claim an action happened if you cannot perform it, and ask a focused follow-up when needed. You can help with planning, writing, explanations, coding, organization, and safe reversible tasks. Do not use canned phrases like "I'm on it" unless they fit the context.`,
      messages: [...history, { role: 'user', content: message }],
      maxOutputTokens: 500,
    })

    if (!result.text.trim()) {
      return NextResponse.json({ error: 'MIRA’s AI provider returned an empty response. Please try again.' }, { status: 502 })
    }

    return NextResponse.json({ reply: result.text })
  } catch (error) {
    const providerMessage = error instanceof Error ? error.message : ''
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
      ? Number(error.statusCode)
      : undefined
    console.error('[MIRA] AbhiBots API request failed:', providerMessage || 'Unknown provider error')
    if (statusCode === 401) {
      return NextResponse.json({ error: 'AbhiBots rejected the key. Check that ABHIBOTS_API_KEY is your active AbhiBots key.' }, { status: 401 })
    }
    if (statusCode === 402 || statusCode === 403 || statusCode === 429) {
      return NextResponse.json({ error: 'AbhiBots rejected the request. Check that the key belongs to your AbhiBots account and has access or quota for this model.' }, { status: statusCode === 429 ? 429 : 402 })
    }
    if (statusCode === 404 || statusCode === 410) {
      return NextResponse.json({ error: 'AbhiBots could not find this model. Set ABHIBOTS_MODEL to an exact model ID supported by your AbhiBots account.' }, { status: 502 })
    }
    return NextResponse.json({
      error: 'MIRA could not reach AbhiBots. Check ABHIBOTS_API_KEY, ABHIBOTS_BASE_URL, and the model configured in ABHIBOTS_MODEL.',
    }, { status: 502 })
  }
}
