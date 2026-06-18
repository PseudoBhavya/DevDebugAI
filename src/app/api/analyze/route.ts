import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { type, userMsg, systemMsg } = await req.json();

    if (!userMsg || !systemMsg) {
      return NextResponse.json({ error: 'Missing userMsg or systemMsg' }, { status: 400 });
    }

    const text = await callGemini(userMsg, systemMsg);

    return NextResponse.json({ text, type });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/analyze]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
