import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This key tester is only available in local development.' }, { status: 404 })
  }

  const origin = request.headers.get('origin')
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Requests must come from this local app.' }, { status: 403 })
  }

  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return NextResponse.json({ error: 'Send the key as JSON.' }, { status: 415 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'The request must contain valid JSON.' }, { status: 400 })
  }

  const apiKey = typeof body === 'object' && body !== null && 'apiKey' in body && typeof body.apiKey === 'string'
    ? body.apiKey.trim()
    : ''
  if (!apiKey || apiKey.length > 512) {
    return NextResponse.json({ error: 'Paste a valid AbhiBots API key to test.' }, { status: 400 })
  }

  try {
    const abhibots = createOpenAI({
      apiKey,
      baseURL: process.env.ABHIBOTS_BASE_URL || 'https://opus.abhibots.com/v1',
    })
    const { text } = await generateText({
      model: abhibots(process.env.ABHIBOTS_MODEL || 'claude-sonnet-5'),
      prompt: 'Reply with exactly MIRA_OK.',
      maxOutputTokens: 16,
    })

    if (!text.trim()) {
      return NextResponse.json({ error: 'AbhiBots accepted the key, but the model returned an empty response.' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, message: 'The AbhiBots key works and the model replied successfully.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
      ? Number(error.statusCode)
      : undefined

    if (statusCode === 401 || /unauthorized|invalid api key|invalid_api_key/i.test(message)) {
      return NextResponse.json({ error: 'AbhiBots rejected this key. Check that it was copied correctly and is still active.' }, { status: 401 })
    }
    if (statusCode === 403 || /permission-denied|credits|licenses|quota/i.test(message)) {
      return NextResponse.json({ error: 'AbhiBots accepted the key, but this account does not have access or quota for the selected model.' }, { status: 402 })
    }
    if (statusCode === 410) {
      return NextResponse.json({ error: 'The selected model has been retired. Choose an active AbhiBots model and set its exact ID as ABHIBOTS_MODEL.' }, { status: 410 })
    }
    if (statusCode === 404 || /model.*not found|does not exist/i.test(message)) {
      return NextResponse.json({ error: 'AbhiBots could not find this model. Choose a model available to your account and set its exact ID as ABHIBOTS_MODEL.' }, { status: 404 })
    }

    console.error('[MIRA] Local AbhiBots API key test failed:', statusCode ?? 'unknown status')
    return NextResponse.json({ error: 'The AbhiBots API test failed. Check the local server terminal for its status code, then verify the key and model access.' }, { status: 502 })
  }
}
