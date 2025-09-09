"use client";
import { useState, useEffect } from 'react';

interface Job {
  id: string;
  status: string;
  video_url?: string | null;
  error?: string | null;
  sections?: any[];
  captions?: { start: number; end: number; text: string }[];
}

export default function VideoGeneratorPage() {
  const [idea, setIdea] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [scriptModel, setScriptModel] = useState('gpt-4o-mini');
  const [videoModel, setVideoModel] = useState('wan-video/wan-2.2-t2v-fast');

  async function submit() {
    setLoading(true);
    const res = await fetch('/api/video/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, scriptModel, videoModel })
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      alert(data.error);
      return;
    }
    setJobId(data.id);
  }

  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/video/status/${jobId}`);
      const data = await res.json();
      setJob(data);
      if (data.status === 'complete' || data.status === 'error') {
        clearInterval(interval);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">AI Short Video Generator</h1>
      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Enter an idea for a TikTok / Reel"
          value={idea}
          onChange={e => setIdea(e.target.value)}
          disabled={!!jobId}
        />
        <button
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={submit}
          disabled={!idea || loading || !!jobId}
        >
          {loading ? 'Starting...' : 'Generate'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Script Model</span>
          <select className="border rounded px-2 py-1" value={scriptModel} disabled={!!jobId} onChange={e=>setScriptModel(e.target.value)}>
            <option value="gpt-4o-mini">Fast (gpt-4o-mini)</option>
            <option value="gpt-4-turbo-preview">Creative (gpt-4-turbo-preview)</option>
            <option value="gpt-4o">Intelligent (gpt-4o)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Video Model</span>
          <select className="border rounded px-2 py-1" value={videoModel} disabled={!!jobId} onChange={e=>setVideoModel(e.target.value)}>
            <option value="wan-video/wan-2.2-t2v-fast">WAN 2.2 Fast (Speed: High | Skill: Medium | Price: $)</option>
            <option value="bytedance/seedance-1-lite">Seedance 1 Lite (Speed: High | Skill: Medium+ | Price: $$)</option>
            <option value="minimax/hailuo-02">Hailuo 02 (Speed: Medium | Skill: High for motion & coherence | Price: $$)</option>
            <option value="kwaivgi/kling-v2.1">Kling v2.1 (Speed: Medium | Skill: High realism | Price: $$$)</option>
            <option value="kwaivgi/kling-v2.1-master">Kling v2.1 Master (Speed: Low | Skill: Very High cinematic detail | Price: $$$$)</option>
          </select>
        </label>
      </div>
      {jobId && !job && <p className="text-sm text-muted-foreground">Creating job...</p>}
      {job && (
        <div className="space-y-3">
          <div className="text-sm">Status: <span className="font-mono font-medium">{job.status}</span></div>
          {job.error && <div className="text-red-600 text-sm">{job.error}</div>}
          {job.sections && (
            <ol className="text-xs space-y-1 list-decimal ml-4">
              {job.sections.map((s: any) => (
                <li key={s.id}>{s.title} {s.script ? '✓' : ''}</li>
              ))}
            </ol>
          )}
          {job.status === 'complete' && (
            <div className="space-y-2">
              {job.video_url && (
                <video
                  className="w-full aspect-[9/16] bg-black"
                  controls
                  src={job.video_url}
                />
              )}
              <details className="text-xs">
                <summary>Captions (preview)</summary>
                <pre className="whitespace-pre-wrap bg-neutral-100 p-2 rounded max-h-48 overflow-auto">
{JSON.stringify(job.captions?.slice(0,40), null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
