import { NextResponse } from 'next/server';

export async function POST(_request: Request) {
  return NextResponse.json({ message: 'TTS API endpoint' }, { status: 200 });
}
