import { notFound } from "next/navigation";
import DashboardNavbar from "@/components/dashboard-navbar";
import VideoPlayer from "@/components/video-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "../../../../../supabase/server";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Share2,
  Eye,
  Clock,
  Film,
  Mic,
  Type,
  Music,
  Copy,
  Edit,
  Sparkles
} from "lucide-react";

export default async function VideoDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  const { data: job, error } = await supabase
    .from('video_jobs')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !job) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const computedDuration = Array.isArray(job.captions) && job.captions.length
    ? Math.round((job.captions[job.captions.length - 1].end || 0))
    : (Array.isArray(job.sections) ? job.sections.reduce((acc: number, s: any) => acc + (s.target_seconds || 0), 0) : 0);

  return (
    <>
      <DashboardNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/videos">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{(job.idea || 'Untitled').slice(0, 100)}</h1>
                <p className="text-muted-foreground mt-1">
                  Created on {formatDate(job.created_at)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" disabled={job.status !== 'complete' || !job.video_url}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Video Player */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-[9/16] max-h-[70vh] mx-auto">
                    {job.video_url && job.status === 'complete' ? (
                      <VideoPlayer 
                        url={job.video_url}
                      />
                    ) : job.status !== 'error' ? (
                      <div className="w-full h-full bg-gradient-to-b from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                          <p className="text-lg font-semibold">{job.status === 'stitching' ? 'Stitching Video...' : 'Processing Video...'}</p>
                          <p className="text-muted-foreground text-sm mt-2">
                            This may take a few minutes
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">Video not available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tabs for Script and Sections */}
              <Card className="mt-6">
                <Tabs defaultValue="script" className="w-full">
                  <CardHeader>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="script">Script</TabsTrigger>
                      <TabsTrigger value="sections">Section Breakdown</TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent>
                    <TabsContent value="script" className="space-y-4">
                      {Array.isArray(job.sections) && job.sections.length ? (
                        <div className="prose prose-sm max-w-none">
                          <p className="whitespace-pre-wrap">{job.sections.map((s: any) => s.script).filter(Boolean).join('\n\n')}</p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No script available</p>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="sections" className="space-y-4">
                      {Array.isArray(job.sections) && job.sections.length ? (
                        <div className="space-y-4">
                          {job.sections.map((section: any, index: number) => (
                            <div key={section.id || index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold">Section {index + 1}: {section.title}</h4>
                                <Badge variant="outline">
                                  {(section.target_seconds || 0)}s
                                </Badge>
                              </div>
                              {section.script && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {section.script}
                                </p>
                              )}
                              {section.shot_prompt && (
                                <div className="bg-muted p-2 rounded text-xs">
                                  <span className="font-medium">Visual Prompt:</span> {section.shot_prompt}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No sections available</p>
                      )}
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Video Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Video Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Duration
                    </span>
                    <span className="font-medium">
                      {computedDuration ? formatDuration(computedDuration) : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Film className="w-4 h-4" />
                      Style
                    </span>
                    <Badge variant="outline" className="capitalize">
                      Default
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Views
                    </span>
                    <span className="font-medium">0</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Downloads
                    </span>
                    <span className="font-medium">0</span>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle>Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mic className={`w-4 h-4 ${job.voiceover_url ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-sm">AI Voiceover</span>
                      </div>
                      {job.voiceover_url ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="outline">Disabled</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Type className={`w-4 h-4 ${Array.isArray(job.captions) && job.captions.length ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-sm">Auto Captions</span>
                      </div>
                      {Array.isArray(job.captions) && job.captions.length ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="outline">Disabled</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" variant="outline" disabled>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Title
                  </Button>
                  <Link href="/dashboard/create" className="block">
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create New Video
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}