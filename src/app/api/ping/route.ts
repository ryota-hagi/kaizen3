import { NextResponse } from 'next/server';

export async function POST() {
  console.log('► PING POST route hit');
  return NextResponse.json({ pong: true });
}

export async function GET() {
  console.log('► PING GET route hit');
  return NextResponse.json({ pong: true });
}
