import { NextRequest, NextResponse } from 'next/server';
import { createVideoJob } from '@/lib/video/orchestrator';
import { createClient } from '../../../../../supabase/server';

export async function POST(req: NextRequest) {
  try {
  const { idea, scriptModel, videoModel } = await req.json();
    if (!idea || idea.length < 5) {
      return NextResponse.json({ error: 'Idea is too short' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
  const job = await createVideoJob(idea, user?.id, { scriptModel, videoModel });
    return NextResponse.json(job);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
