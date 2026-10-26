import { generateText, gateway } from 'ai'
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
  if (!process.env.AI_GATEWAY_API_KEY) {
    return NextResponse.json({
      error: 'MIRA’s AI brain is not configured. Add AI_GATEWAY_API_KEY to your local environment and Vercel project settings.',
    }, { status: 503 })
  }

  const history = Array.isArray(body.history)
    ? body.history.filter((item): item is { role: 'user' | 'assistant'; content: string } => {
        if (!isRecord(item)) return false
        return (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string'
      }).slice(-10).map(({ role, content }) => ({ role, content: content.slice(0, 4000) }))
    : []

  try {
    const result = await generateText({
      model: gateway('xai/grok-4.1-fast'),
      system: `You are MIRA, a capable, warm, concise personal AI assistant. Reply naturally to every user message. Be honest about what you can and cannot do in this browser app, never claim an action happened if you cannot perform it, and ask a focused follow-up when needed. You can help with planning, writing, explanations, coding, organization, and safe reversible tasks. Do not use canned phrases like "I'm on it" unless they fit the context.`,
      messages: [...history, { role: 'user', content: message }],
      maxOutputTokens: 500,
    })

    if (!result.text.trim()) {
      return NextResponse.json({ error: 'MIRA’s AI provider returned an empty response. Please try again.' }, { status: 502 })
    }

    return NextResponse.json({ reply: result.text })
  } catch (error) {
    console.error('[MIRA] AI Gateway request failed:', error instanceof Error ? error.message : 'Unknown provider error')
    return NextResponse.json({
      error: 'MIRA could not reach the xAI model through AI Gateway. Check your API key, model access, and Gateway status, then retry.',
    }, { status: 502 })
  }
}
