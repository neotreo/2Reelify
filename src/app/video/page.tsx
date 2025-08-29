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

  async function submit() {
    setLoading(true);
    const res = await fetch('/api/video/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea })
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
