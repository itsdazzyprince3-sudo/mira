import { generateText, gateway } from 'ai'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const history = Array.isArray(body.history) ? body.history : []

    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }

    const result = await generateText({
      model: gateway('xai/grok-4.1-fast'),
      system: `You are MIRA, a capable, warm, concise personal AI assistant. Reply naturally to every user message. Be honest about what you can and cannot do in this browser app, never claim an action happened if you cannot perform it, and ask a focused follow-up when needed. You can help with planning, writing, explanations, coding, organization, and safe reversible tasks. Do not use canned phrases like "I'm on it" unless they fit the context.`,
      messages: [
        ...history.slice(-10).filter((item: unknown) => {
          if (!item || typeof item !== 'object') return false
          const record = item as { role?: unknown; content?: unknown }
          return (record.role === 'user' || record.role === 'assistant') && typeof record.content === 'string'
        }),
        { role: 'user', content: message },
      ],
      maxOutputTokens: 500,
    })

    return NextResponse.json({ reply: result.text })
  } catch (error) {
    console.error('[v0] MIRA chat request failed:', error)
    return NextResponse.json({ error: 'MIRA could not connect right now.' }, { status: 500 })
  }
}
