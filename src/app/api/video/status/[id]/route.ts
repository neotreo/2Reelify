import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/video/store';

export async function GET(_req: NextRequest, { params }: { params: { id: string }}) {
  try {
    const job = await getJob(params.id);
    return NextResponse.json(job);
  } catch (e: any) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
