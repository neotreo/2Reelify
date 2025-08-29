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
  Calendar,
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

  const { data: video, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !video) {
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
                <h1 className="text-2xl font-bold">{video.title}</h1>
                <p className="text-muted-foreground mt-1">
                  Created on {formatDate(video.created_at)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
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
                    {video.video_url && video.status === 'complete' ? (
                      <VideoPlayer 
                        url={video.video_url}
                        poster={video.thumbnail_url}
                      />
                    ) : video.status === 'processing' ? (
                      <div className="w-full h-full bg-gradient-to-b from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                          <p className="text-lg font-semibold">Processing Video...</p>
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

              {/* Tabs for Script and Scenes */}
              <Card className="mt-6">
                <Tabs defaultValue="script" className="w-full">
                  <CardHeader>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="script">Script</TabsTrigger>
                      <TabsTrigger value="scenes">Scene Breakdown</TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent>
                    <TabsContent value="script" className="space-y-4">
                      {video.script ? (
                        <div className="prose prose-sm max-w-none">
                          <p className="whitespace-pre-wrap">{video.script}</p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No script available</p>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="scenes" className="space-y-4">
                      {video.scenes && Array.isArray(video.scenes) ? (
                        <div className="space-y-4">
                          {video.scenes.map((scene: any, index: number) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold">Scene {index + 1}</h4>
                                <Badge variant="outline">
                                  {scene.duration}s
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {scene.text}
                              </p>
                              <div className="bg-muted p-2 rounded text-xs">
                                <span className="font-medium">Visual Prompt:</span> {scene.videoPrompt}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No scene breakdown available</p>
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
                      {video.duration ? formatDuration(video.duration) : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Film className="w-4 h-4" />
                      Style
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {video.style || 'Default'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Views
                    </span>
                    <span className="font-medium">{video.view_count || 0}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Downloads
                    </span>
                    <span className="font-medium">{video.download_count || 0}</span>
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
                        <Mic className={`w-4 h-4 ${video.has_voiceover ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-sm">AI Voiceover</span>
                      </div>
                      {video.has_voiceover ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="outline">Disabled</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Type className={`w-4 h-4 ${video.has_captions ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-sm">Auto Captions</span>
                      </div>
                      {video.has_captions ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="outline">Disabled</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Music className={`w-4 h-4 ${video.has_music ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-sm">Background Music</span>
                      </div>
                      {video.has_music ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="outline">Disabled</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Voice & Music Info */}
              {(video.voice_type || video.music_type) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Audio Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {video.voice_type && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Voice Type</p>
                        <Badge variant="secondary" className="capitalize">
                          {video.voice_type}
                        </Badge>
                      </div>
                    )}
                    {video.music_type && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Music Type</p>
                        <Badge variant="secondary" className="capitalize">
                          {video.music_type}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Title
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate Video
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